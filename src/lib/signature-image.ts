import { PDFDocument } from "pdf-lib";
import { MAX_SIGNATURE_IMAGE_BYTES, MAX_SIGNATURE_IMAGE_DIMENSION } from "./signature-limits";

export async function decodeSignaturePng(dataUrl: string) {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix) || dataUrl.length > prefix.length + Math.ceil(MAX_SIGNATURE_IMAGE_BYTES / 3) * 4) {
    throw new Error("La imagen de firma no es valida o supera el tamaño permitido.");
  }
  const encoded = dataUrl.slice(prefix.length);
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("La imagen de firma no es valida.");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 33 || bytes.length > MAX_SIGNATURE_IMAGE_BYTES ||
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("La imagen de firma no es un PNG valido.");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height || width > MAX_SIGNATURE_IMAGE_DIMENSION || height > MAX_SIGNATURE_IMAGE_DIMENSION || width * height > 4_000_000) {
    throw new Error("Las dimensiones de la firma no son validas.");
  }
  // Decode with the same library used to generate the final PDF, before persisting acceptance.
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(bytes);
  if (image.width !== width || image.height !== height) throw new Error("La imagen de firma no es valida.");
  await pdf.save();
  return bytes;
}
