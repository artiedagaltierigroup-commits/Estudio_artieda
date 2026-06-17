import {
  downloadStorageObject,
  getAuthenticatedSignatureRequest,
  jsonError,
  logSignatureArtifactDownload,
} from "../downloads";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAuthenticatedSignatureRequest(id);
  if ("error" in result) return result.error;

  const { request, userId } = result;
  if (request.status !== "SIGNED" || !request.document?.signedStoragePath) {
    return jsonError("El PDF firmado todavia no esta disponible", 409);
  }

  const response = await downloadStorageObject(
    request.document.signedStoragePath,
    "application/pdf",
    `firmado-${request.document.originalFileName}`
  );
  if (response.status >= 400) return response;

  await logSignatureArtifactDownload({
    userId,
    requestId: request.id,
    documentId: request.document.id,
    artifact: "signed-document",
  });

  return response;
}
