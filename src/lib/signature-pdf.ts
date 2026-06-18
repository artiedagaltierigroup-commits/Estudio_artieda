import { createHash } from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface NormalizedPlacement {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EmbedSignatureParams {
  originalPdfBytes: Uint8Array;
  signaturePngBytes: Uint8Array;
  signerName: string;
  signedAt: Date;
  pageNumber: number;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface SignaturePlacementInput {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RecipientSignatureInput {
  signerName: string;
  signedAt: Date;
  signaturePngBytes: Uint8Array;
  placements: SignaturePlacementInput[];
}

interface EmbedRecipientSignaturesParams {
  originalPdfBytes: Uint8Array;
  recipients: RecipientSignatureInput[];
}

export function toPdfPlacement(params: NormalizedPlacement) {
  const width = params.pageWidth * params.width;
  const height = params.pageHeight * params.height;
  const x = params.pageWidth * params.x;
  const y = params.pageHeight - params.pageHeight * params.y - height;

  return { x, y, width, height };
}

export async function embedRecipientSignaturesInPdf(params: EmbedRecipientSignaturesParams) {
  const pdf = await PDFDocument.load(params.originalPdfBytes);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const recipient of params.recipients) {
    const signatureImage = await pdf.embedPng(recipient.signaturePngBytes);

    for (const recipientPlacement of recipient.placements) {
      const pageIndex = Math.max(0, Math.min(recipientPlacement.pageNumber - 1, pages.length - 1));
      const page = pages[pageIndex];
      const pageSize = page.getSize();
      const placement = toPdfPlacement({
        pageWidth: pageSize.width,
        pageHeight: pageSize.height,
        x: recipientPlacement.x,
        y: recipientPlacement.y,
        width: recipientPlacement.width,
        height: recipientPlacement.height,
      });

      page.drawImage(signatureImage, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });

      const footer = `Firmado electronicamente por ${recipient.signerName} - ${recipient.signedAt.toISOString()}`;
      page.drawText(footer, {
        x: placement.x,
        y: Math.max(12, placement.y - 14),
        size: 7,
        font,
        color: rgb(0.28, 0.23, 0.25),
        maxWidth: Math.max(placement.width, 220),
      });
    }
  }

  const signedPdfBytes = await pdf.save();
  const signedSha256 = createHash("sha256").update(signedPdfBytes).digest("hex");

  return {
    signedPdfBytes,
    signedSha256,
  };
}

export async function embedSignatureInPdf(params: EmbedSignatureParams) {
  return embedRecipientSignaturesInPdf({
    originalPdfBytes: params.originalPdfBytes,
    recipients: [
      {
        signerName: params.signerName,
        signedAt: params.signedAt,
        signaturePngBytes: params.signaturePngBytes,
        placements: [
          {
            pageNumber: params.pageNumber,
            x: params.placement.x,
            y: params.placement.y,
            width: params.placement.width,
            height: params.placement.height,
          },
        ],
      },
    ],
  });
}
