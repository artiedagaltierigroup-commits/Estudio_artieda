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
  "PARTIALLY_SIGNED",
];

export function summarizeSignatureRequests(requests: Array<{ status: string; recipients?: Array<{ status: string }> }>) {
  const recipientRows = requests.flatMap((request) =>
    request.recipients && request.recipients.length > 0 ? request.recipients : [{ status: request.status }]
  );

  return {
    total: requests.length,
    pending: requests.filter((request) => pendingStatuses.includes(request.status as SignatureRequestStatus)).length,
    signed: requests.filter((request) => request.status === "SIGNED").length,
    recipients: recipientRows.length,
    signedRecipients: recipientRows.filter((recipient) => recipient.status === "SIGNED").length,
  };
}
