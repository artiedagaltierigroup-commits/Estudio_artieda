import { createHash } from "crypto";
import { db } from "@/db";
import { signatureEvents, signatureRecipients, signatureRequests } from "@/db/schema";
import { getAggregateSignatureStatus } from "@/lib/signature-recipients";
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

async function updateRequestAggregateStatus(requestId: string) {
  const recipients = await db.query.signatureRecipients.findMany({
    where: (recipient, { eq: eqOperator }) => eqOperator(recipient.signatureRequestId, requestId),
  });

  await db
    .update(signatureRequests)
    .set({ status: getAggregateSignatureStatus(recipients), updatedAt: new Date() })
    .where(eq(signatureRequests.id, requestId));
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await db.query.signatureRecipients.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.tokenHash, hashToken(token)),
    with: {
      request: true,
    },
  });

  if (recipient && canMarkEmailOpened(recipient.status) && canMarkEmailOpened(recipient.request.status)) {
    await db.insert(signatureEvents).values({
      userId: recipient.userId,
      signatureRequestId: recipient.signatureRequestId,
      signatureRecipientId: recipient.id,
      type: "email_opened",
    });

    await db
      .update(signatureRecipients)
      .set({ status: "EMAIL_OPENED", updatedAt: new Date() })
      .where(eq(signatureRecipients.id, recipient.id));

    await updateRequestAggregateStatus(recipient.signatureRequestId);
  }

  return new Response(transparentPng, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
