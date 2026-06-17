import type { SignatureRequestStatus } from "./signature-status";

const pendingStatuses: SignatureRequestStatus[] = [
  "DRAFT",
  "READY",
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "DOCUMENT_VIEWED",
  "SIGNING_STARTED",
  "SIGNING_INTERRUPTED",
];

export function summarizeSignatureRequests(requests: Array<{ status: string }>) {
  return {
    total: requests.length,
    pending: requests.filter((request) => pendingStatuses.includes(request.status as SignatureRequestStatus)).length,
    signed: requests.filter((request) => request.status === "SIGNED").length,
  };
}
