export function normalizeSignatureEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildDefaultSignatureSubject(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `Solicitud de firma: ${cleanName}`;
}
