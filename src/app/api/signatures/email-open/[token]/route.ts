import { createHash } from "crypto";
import { db } from "@/db";
import { signatureEvents, signatureRecipients, signatureRequests } from "@/db/schema";
import { getAggregateSignatureStatus } from "@/lib/signature-recipients";
import { withSignatureRequestLock } from "@/lib/signature-transaction";
import { and, eq, gt } from "drizzle-orm";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await db.query.signatureRecipients.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.tokenHash, hashToken(token)),
    with: {
      request: true,
    },
  });

  if (recipient) {
    await withSignatureRequestLock(recipient.signatureRequestId, async (tx) => {
      const currentRequest = await tx.query.signatureRequests.findFirst({ where: eq(signatureRequests.id, recipient.signatureRequestId) });
      if (!currentRequest || ["SIGNED", "REJECTED", "EXPIRED", "CANCELLED"].includes(currentRequest.status)) return;
      const now = new Date();
      const changed = await tx.update(signatureRecipients).set({ status: "EMAIL_OPENED", updatedAt: now }).where(and(
        eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.tokenHash, hashToken(token)),
        eq(signatureRecipients.userId, currentRequest.userId), eq(signatureRecipients.status, "SENT"),
        gt(signatureRecipients.tokenExpiresAt, now),
      )).returning({ id: signatureRecipients.id });
      if (!changed.length) return;
      await tx.insert(signatureEvents).values({
        userId: currentRequest.userId, signatureRequestId: recipient.signatureRequestId,
        signatureRecipientId: recipient.id, type: "email_opened",
      });
      const recipients = await tx.query.signatureRecipients.findMany({ where: eq(signatureRecipients.signatureRequestId, recipient.signatureRequestId) });
      await tx.update(signatureRequests).set({ status: getAggregateSignatureStatus(recipients), updatedAt: now }).where(eq(signatureRequests.id, recipient.signatureRequestId));
    });
  }

  return new Response(transparentPng, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
