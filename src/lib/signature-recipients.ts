import type { SignatureRequestStatus } from "./signature-status";

export const MAX_SIGNATURE_RECIPIENTS = 50;

export type SignatureRecipientStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "EMAIL_OPENED"
  | "LINK_OPENED"
  | "DOCUMENT_VIEWED"
  | "SIGNING_STARTED"
  | "SIGNING_INTERRUPTED"
  | "SIGNED"
  | "EXPIRED"
  | "CANCELLED";

export type AggregateSignatureStatus = SignatureRequestStatus | "PARTIALLY_SIGNED";

type RecipientStatusInput = {
  status: SignatureRecipientStatus;
};

type RecipientPlacementInput = {
  placements?: ReadonlyArray<unknown> | null;
};

type RecipientPlacementLabelInput = RecipientPlacementInput & {
  fullName?: string | null;
  email?: string | null;
};

export function canAddSignatureRecipient(count: number) {
  return count < MAX_SIGNATURE_RECIPIENTS;
}

export function recipientHasRequiredPlacements(recipient: RecipientPlacementInput) {
  return (recipient.placements?.length ?? 0) > 0;
}

export function getFirstRecipientMissingPlacements<TRecipient extends RecipientPlacementLabelInput>(
  recipients: ReadonlyArray<TRecipient>
) {
  return recipients.find((recipient) => !recipientHasRequiredPlacements(recipient)) ?? null;
}

export function getAggregateSignatureStatus(recipients: ReadonlyArray<RecipientStatusInput>): AggregateSignatureStatus {
  if (recipients.length === 0) return "DRAFT";

  const statuses = recipients.map((recipient) => recipient.status);

  if (statuses.every((status) => status === "SIGNED")) return "SIGNED";
  if (statuses.some((status) => status === "SIGNED")) return "PARTIALLY_SIGNED";
  if (statuses.every((status) => status === "CANCELLED")) return "CANCELLED";
  if (statuses.every((status) => status === "EXPIRED" || status === "CANCELLED")) return "EXPIRED";

  if (
    statuses.some((status) =>
      ["SENT", "EMAIL_OPENED", "LINK_OPENED", "DOCUMENT_VIEWED", "SIGNING_STARTED", "SIGNING_INTERRUPTED"].includes(status),
    )
  ) {
    return "SENT";
  }

  if (statuses.some((status) => status === "READY")) return "READY";

  return "DRAFT";
}
