import { z } from "zod";
import { MAX_SIGNATURE_RECIPIENTS } from "../lib/signature-recipients";

const EmailSchema = z.string().email();
const RecipientFieldPattern = /^recipients\[(\d+)\]\.(firstName|lastName|email|taxId|clientId)$/;
const PlacementFieldPattern =
  /^recipients\[(\d+)\]\.placements\[(\d+)\]\.(pageNumber|x|y|width|height)$/;

export type SignaturePlacementFormValue = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SignatureRecipientFormValue = {
  firstName: string;
  lastName: string;
  fullName: string | null;
  email: string;
  taxId: string | null;
  clientId: string | null;
  placements: SignaturePlacementFormValue[];
};

type RecipientDraft = {
  firstName?: string;
  lastName?: string;
  email?: string;
  taxId?: string;
  clientId?: string;
  placements: Map<number, Partial<Record<keyof SignaturePlacementFormValue, string>>>;
};

export function normalizeSignatureEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildDefaultSignatureSubject(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `Solicitud de firma: ${cleanName}`;
}

export function buildRecipientName(params: { firstName?: string | null; lastName?: string | null }) {
  return [params.firstName, params.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function splitPersonName(name: string | null | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const [firstName = "", ...lastNameParts] = parts;

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

export function parseSignatureRecipientsFromFormData(formData: FormData): SignatureRecipientFormValue[] {
  const drafts = new Map<number, RecipientDraft>();

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;

    const recipientMatch = key.match(RecipientFieldPattern);
    if (recipientMatch) {
      const index = Number(recipientMatch[1]);
      const field = recipientMatch[2] as keyof Omit<RecipientDraft, "placements">;
      const draft = getRecipientDraft(drafts, index);
      draft[field] = value;
      continue;
    }

    const placementMatch = key.match(PlacementFieldPattern);
    if (placementMatch) {
      const recipientIndex = Number(placementMatch[1]);
      const placementIndex = Number(placementMatch[2]);
      const field = placementMatch[3] as keyof SignaturePlacementFormValue;
      const draft = getRecipientDraft(drafts, recipientIndex);
      const placement = draft.placements.get(placementIndex) ?? {};
      placement[field] = value;
      draft.placements.set(placementIndex, placement);
    }
  }

  if (drafts.size === 0) {
    return parseLegacySignatureRecipient(formData);
  }

  return [...drafts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, draft]) => normalizeRecipientDraft(draft));
}

export function validateSignatureRecipients(recipients: SignatureRecipientFormValue[]) {
  if (recipients.length === 0) {
    return { success: false as const, error: "Agrega al menos un destinatario" };
  }

  if (recipients.length > MAX_SIGNATURE_RECIPIENTS) {
    return { success: false as const, error: "No se pueden agregar mas destinatarios" };
  }

  for (const recipient of recipients) {
    if (!recipient.email) {
      return { success: false as const, error: "Cada destinatario necesita un email" };
    }

    if (!EmailSchema.safeParse(recipient.email).success) {
      return { success: false as const, error: "Email del destinatario invalido" };
    }

    if (recipient.placements.length === 0) {
      return { success: false as const, error: "Cada destinatario necesita al menos un espacio de firma" };
    }
  }

  return { success: true as const };
}

export function buildRecipientTokenPayloads(
  recipients: SignatureRecipientFormValue[],
  options: {
    tokenFactory: (recipient: SignatureRecipientFormValue, index: number) => string;
    hashToken: (token: string) => string;
    tokenExpiresAt: Date;
  }
) {
  return recipients.map((recipient, index) => {
    const token = options.tokenFactory(recipient, index);

    return {
      recipient,
      email: recipient.email,
      token,
      tokenHash: options.hashToken(token),
      tokenExpiresAt: options.tokenExpiresAt,
    };
  });
}

function getRecipientDraft(drafts: Map<number, RecipientDraft>, index: number) {
  const existing = drafts.get(index);
  if (existing) return existing;

  const draft: RecipientDraft = { placements: new Map() };
  drafts.set(index, draft);
  return draft;
}

function parseLegacySignatureRecipient(formData: FormData): SignatureRecipientFormValue[] {
  const email = getStringFormValue(formData, "recipientEmail");
  if (!email) return [];

  return [
    normalizeRecipientDraft({
      firstName: getStringFormValue(formData, "recipientFirstName"),
      lastName: getStringFormValue(formData, "recipientLastName"),
      email,
      taxId: getStringFormValue(formData, "recipientTaxId"),
      clientId: getStringFormValue(formData, "clientId"),
      placements: new Map(),
    }),
  ];
}

function normalizeRecipientDraft(draft: RecipientDraft): SignatureRecipientFormValue {
  const firstName = draft.firstName?.trim() ?? "";
  const lastName = draft.lastName?.trim() ?? "";
  const fullName = buildRecipientName({ firstName, lastName }) || null;

  return {
    firstName,
    lastName,
    fullName,
    email: draft.email ? normalizeSignatureEmail(draft.email) : "",
    taxId: normalizeOptionalFormValue(draft.taxId),
    clientId: normalizeOptionalFormValue(draft.clientId),
    placements: [...draft.placements.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, placement]) => ({
        pageNumber: Number(placement.pageNumber),
        x: Number(placement.x),
        y: Number(placement.y),
        width: Number(placement.width),
        height: Number(placement.height),
      })),
  };
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeOptionalFormValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
