import { db } from "@/db";
import { signatureEvents, signatureRecipients, signatureRequests } from "@/db/schema";
import {
  EXPIRABLE_SIGNATURE_RECIPIENT_STATUSES,
  shouldExpireSignatureRequestFromRecipients,
} from "@/lib/signature-expiration";
import { getAggregateSignatureStatus } from "@/lib/signature-recipients";
import { and, eq, inArray, lt } from "drizzle-orm";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const expiredRecipients = await db.query.signatureRecipients.findMany({
    where: (item) =>
      and(
        inArray(item.status, EXPIRABLE_SIGNATURE_RECIPIENT_STATUSES),
        lt(item.tokenExpiresAt, now)
      ),
    with: {
      request: {
        with: {
          recipients: true,
        },
      },
    },
  });

  for (const recipient of expiredRecipients) {
    await db
      .update(signatureRecipients)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(signatureRecipients.id, recipient.id));

    await db.insert(signatureEvents).values({
      userId: recipient.userId,
      signatureRequestId: recipient.signatureRequestId,
      signatureRecipientId: recipient.id,
      type: "expired",
      metadata: { tokenExpiresAt: recipient.tokenExpiresAt },
    });

    const recipients = recipient.request.recipients.map((requestRecipient) =>
      requestRecipient.id === recipient.id ? { ...requestRecipient, status: "EXPIRED" as const } : requestRecipient
    );
    const nextStatus = shouldExpireSignatureRequestFromRecipients(recipients)
      ? "EXPIRED"
      : getAggregateSignatureStatus(recipients);

    await db
      .update(signatureRequests)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(signatureRequests.id, recipient.signatureRequestId));
  }

  return Response.json({
    ok: true,
    expired: expiredRecipients.length,
    syncedAt: now.toISOString(),
  });
}
