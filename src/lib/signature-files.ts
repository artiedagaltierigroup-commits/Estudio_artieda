import { createHash } from "crypto";

interface BuildPathParams {
  userId: string;
  requestId: string;
  kind: "original" | "signed" | "signature" | "certificate";
  fileName: string;
}

export const SIGNATURE_BUCKET = "signature-documents";

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildSignatureStoragePath(params: BuildPathParams) {
  return `${params.userId}/signature-requests/${params.requestId}/${params.kind}/${sanitizeFileName(params.fileName)}`;
}

export function buildSignedDocumentRetention(params: {
  originalStoragePath: string;
  signedStoragePath: string;
}) {
  return {
    originalStoragePath: params.signedStoragePath,
    storagePathsToDelete:
      params.originalStoragePath === params.signedStoragePath ? [] : [params.originalStoragePath],
  };
}

export async function hashBufferSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
