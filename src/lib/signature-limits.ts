// Leaves room for multipart fields below the hosting provider's request limit.
export const MAX_SIGNATURE_PDF_BYTES = 3 * 1024 * 1024;
export const MAX_SIGNATURE_PDF_MB = 3;
export const MAX_SIGNATURE_IMAGE_BYTES = 512 * 1024;
export const MAX_SIGNATURE_IMAGE_DIMENSION = 2048;

export function getSignatureCanvasScale(width: number, height: number, devicePixelRatio: number) {
  return Math.min(Math.max(devicePixelRatio || 1, 1), MAX_SIGNATURE_IMAGE_DIMENSION / Math.max(width, 1), MAX_SIGNATURE_IMAGE_DIMENSION / Math.max(height, 1));
}
