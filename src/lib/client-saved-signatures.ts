export function shouldOfferSavedSignature(params: {
  clientId: string | null;
  savedSignatureId: string | null;
}) {
  return Boolean(params.clientId && params.savedSignatureId);
}
