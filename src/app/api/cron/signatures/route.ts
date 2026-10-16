import { db } from "@/db";
import { signatureEvents, signatureRecipients, signatureRequests } from "@/db/schema";
import {
  EXPIRABLE_SIGNATURE_RECIPIENT_STATUSES,
  shouldExpireSignatureRequestFromRecipients,
} from "@/lib/signature-expiration";
import { getAggregateSignatureStatus } from "@/lib/signature-recipients";
import { and, eq, inArray, lt } from "drizzle-orm";
import { isCronAuthorized } from "@/lib/cron-auth";
import { withSignatureRequestLock } from "@/lib/signature-transaction";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const expiredRecipients = await db.query.signatureRecipients.findMany({
    where: (item) =>
      and(
        inArray(item.status, EXPIRABLE_SIGNATURE_RECIPIENT_STATUSES),
        lt(item.tokenExpiresAt, now)
      ),
  });

  let expired = 0;
  const requestIds = [...new Set(expiredRecipients.map((recipient) => recipient.signatureRequestId))];
  for (const requestId of requestIds) {
    expired += await withSignatureRequestLock(requestId, async (tx) => {
      const current = await tx.query.signatureRequests.findFirst({ where: eq(signatureRequests.id, requestId) });
      if (!current || ["SIGNED", "CANCELLED", "REJECTED", "EXPIRED"].includes(current.status)) return 0;
      // Recheck status and deadline after the shared lock; the initial query is only a candidate list.
      const changed = await tx.update(signatureRecipients).set({ status: "EXPIRED", updatedAt: now }).where(and(
        eq(signatureRecipients.signatureRequestId, requestId),
        eq(signatureRecipients.userId, current.userId),
        inArray(signatureRecipients.status, EXPIRABLE_SIGNATURE_RECIPIENT_STATUSES),
        lt(signatureRecipients.tokenExpiresAt, now),
      )).returning();
      if (!changed.length) return 0;
      await tx.insert(signatureEvents).values(changed.map((recipient) => ({
        userId: recipient.userId, signatureRequestId: requestId, signatureRecipientId: recipient.id,
        type: "expired" as const, metadata: { tokenExpiresAt: recipient.tokenExpiresAt },
      })));
      const recipients = await tx.query.signatureRecipients.findMany({ where: eq(signatureRecipients.signatureRequestId, requestId) });
      const nextStatus = shouldExpireSignatureRequestFromRecipients(recipients) ? "EXPIRED" : getAggregateSignatureStatus(recipients);
      await tx.update(signatureRequests).set({ status: nextStatus, updatedAt: now }).where(eq(signatureRequests.id, requestId));
      return changed.length;
    });
  }

  return Response.json({
    ok: true,
    expired,
    syncedAt: now.toISOString(),
  });
}
