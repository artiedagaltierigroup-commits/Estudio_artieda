import type { SignatureRequestStatus } from "./signature-status";

export const EXPIRABLE_SIGNATURE_STATUSES: SignatureRequestStatus[] = [
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "DOCUMENT_VIEWED",
  "SIGNING_STARTED",
  "SIGNING_INTERRUPTED",
];

export function isSignatureRequestExpired(params: {
  status: string;
  tokenExpiresAt: Date;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  return (
    EXPIRABLE_SIGNATURE_STATUSES.includes(params.status as SignatureRequestStatus) &&
    params.tokenExpiresAt.getTime() <= now.getTime()
  );
}
