import { createHash } from "crypto";
import { db } from "@/db";
import { signatureEvents, signatureRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function canMarkEmailOpened(status: string) {
  return !["SIGNED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status);
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await db.query.signatureRequests.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.tokenHash, hashToken(token)),
  });

  if (request && canMarkEmailOpened(request.status)) {
    await db.insert(signatureEvents).values({
      userId: request.userId,
      signatureRequestId: request.id,
      type: "email_opened",
    });

    await db
      .update(signatureRequests)
      .set({ status: "EMAIL_OPENED", updatedAt: new Date() })
      .where(eq(signatureRequests.id, request.id));
  }

  return new Response(transparentPng, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
