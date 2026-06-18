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
