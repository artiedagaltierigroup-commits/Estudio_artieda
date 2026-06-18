import type { SignatureRequestStatus } from "./signature-status";
import type { SignatureRecipientStatus } from "./signature-recipients";

export const LEGACY_SIGNATURE_RECIPIENT_COLOR = "#9A4E69";

export type LegacySignatureRequest = {
  id: string;
  userId: string;
  clientId: string | null;
  recipientName: string | null;
  recipientEmail: string;
  recipientTaxId: string | null;
  status: SignatureRequestStatus;
  tokenHash: string;
  tokenExpiresAt: Date;
  sentAt: Date | null;
  signedAt: Date | null;
  cancelledAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LegacySignatureDocument = {
  userId: string;
  signatureRequestId: string;
  signatureStoragePath: string | null;
  signatureSha256: string | null;
  pageNumber: number;
  placementX: string;
  placementY: string;
  placementWidth: string;
  placementHeight: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LegacySignatureRecipientInsert = {
  userId: string;
  signatureRequestId: string;
  clientId: string | null;
  firstName: string;
  lastName: string;
  fullName: string | null;
  email: string;
  taxId: string | null;
  status: SignatureRecipientStatus;
  tokenHash: string;
  tokenExpiresAt: Date;
  sentAt: Date | null;
  signedAt: Date | null;
  cancelledAt: Date | null;
  color: string;
  sortOrder: number;
  signatureStoragePath: string | null;
  signatureSha256: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LegacySignaturePlacementInsert = {
  userId: string;
  signatureRequestId: string;
  recipientId: string;
  pageNumber: number;
  placementX: string;
  placementY: string;
  placementWidth: string;
  placementHeight: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function mapLegacySignatureStatusToRecipientStatus(status: SignatureRequestStatus): SignatureRecipientStatus {
  if (status === "REJECTED") return "CANCELLED";
  if (status === "PARTIALLY_SIGNED") return "SIGNED";

  return status;
}

export function mapLegacySignatureRequestToRecipientRows({
  request,
  document,
  recipientId,
}: {
  request: LegacySignatureRequest;
  document: LegacySignatureDocument | null;
  recipientId: string;
}) {
  const name = splitLegacyRecipientName(request.recipientName, request.recipientEmail);

  return {
    recipient: {
      userId: request.userId,
      signatureRequestId: request.id,
      clientId: request.clientId,
      firstName: name.firstName,
      lastName: name.lastName,
      fullName: name.fullName,
      email: request.recipientEmail,
      taxId: request.recipientTaxId,
      status: mapLegacySignatureStatusToRecipientStatus(request.status),
      tokenHash: request.tokenHash,
      tokenExpiresAt: request.tokenExpiresAt,
      sentAt: request.sentAt,
      signedAt: request.signedAt,
      cancelledAt: request.cancelledAt ?? request.rejectedAt,
      color: LEGACY_SIGNATURE_RECIPIENT_COLOR,
      sortOrder: 0,
      signatureStoragePath: document?.signatureStoragePath ?? null,
      signatureSha256: document?.signatureSha256 ?? null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    placement: document
      ? {
          userId: document.userId,
          signatureRequestId: document.signatureRequestId,
          recipientId,
          pageNumber: document.pageNumber,
          placementX: document.placementX,
          placementY: document.placementY,
          placementWidth: document.placementWidth,
          placementHeight: document.placementHeight,
          sortOrder: 0,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        }
      : null,
  } satisfies {
    recipient: LegacySignatureRecipientInsert;
    placement: LegacySignaturePlacementInsert | null;
  };
}

function splitLegacyRecipientName(name: string | null, email: string) {
  const fullName = name?.trim().replace(/\s+/g, " ") ?? "";

  if (!fullName) {
    return {
      firstName: email,
      lastName: "",
      fullName: null,
    };
  }

  const [firstName, ...lastNameParts] = fullName.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    fullName,
  };
}
