// Signature workflows only need the association and ownership boundary. Keep this
// allowlist explicit so new financial case columns cannot enter shared responses.
export const signatureCaseColumns = {
  id: true,
  userId: true,
  clientId: true,
  title: true,
} as const;
