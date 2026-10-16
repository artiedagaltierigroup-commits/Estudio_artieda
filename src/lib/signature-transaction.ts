import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { signatureRequests } from "../db/schema";

export type SignatureTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Every mutation of a request and its recipients takes this lock first, including expiration.
export async function withSignatureRequestLock<T>(requestId: string, work: (tx: SignatureTransaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.select({ id: signatureRequests.id }).from(signatureRequests).where(eq(signatureRequests.id, requestId)).for("update");
    return work(tx);
  });
}

export const ACTIVE_SIGNATURE_RECIPIENT_STATUSES = [
  "SENT", "EMAIL_OPENED", "LINK_OPENED", "DOCUMENT_VIEWED", "SIGNING_STARTED", "SIGNING_INTERRUPTED",
] as const;

export function canEditSignatureDocument(request: {
  status: string;
  sentAt: Date | null;
  recipients: { status: string; sentAt: Date | null; signedAt: Date | null }[];
}) {
  return ["DRAFT", "READY"].includes(request.status) && !request.sentAt && request.recipients.every(
    (recipient) => ["DRAFT", "READY"].includes(recipient.status) && !recipient.sentAt && !recipient.signedAt,
  );
}
