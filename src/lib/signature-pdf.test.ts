import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { embedRecipientSignaturesInPdf, toPdfPlacement } from "./signature-pdf";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6D3VwAAAABJRU5ErkJggg==",
  "base64"
);

async function createBlankPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  return pdf.save();
}

describe("signature pdf placement", () => {
  it("converts normalized placement into PDF points", () => {
    expect(
      toPdfPlacement({
        pageWidth: 600,
        pageHeight: 800,
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.1,
      })
    ).toEqual({
      x: 60,
      y: 560,
      width: 300,
      height: 80,
    });
  });

  it("places the same recipient signature in more than one placement", async () => {
    const originalPdfBytes = await createBlankPdf();

    const signed = await embedRecipientSignaturesInPdf({
      originalPdfBytes,
      recipients: [
        {
          signerName: "Ana Perez",
          signedAt: new Date("2026-06-18T10:00:00.000Z"),
          signaturePngBytes: tinyPng,
          placements: [
            { pageNumber: 1, x: 0.1, y: 0.2, width: 0.25, height: 0.1 },
            { pageNumber: 1, x: 0.55, y: 0.7, width: 0.25, height: 0.1 },
          ],
        },
      ],
    });

    const loaded = await PDFDocument.load(signed.signedPdfBytes);
    expect(loaded.getPageCount()).toBe(1);
    expect(signed.signedSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes the signed PDF hash when another recipient signature is added", async () => {
    const originalPdfBytes = await createBlankPdf();
    const signedAt = new Date("2026-06-18T10:00:00.000Z");

    const oneRecipient = await embedRecipientSignaturesInPdf({
      originalPdfBytes,
      recipients: [
        {
          signerName: "Ana Perez",
          signedAt,
          signaturePngBytes: tinyPng,
          placements: [{ pageNumber: 1, x: 0.1, y: 0.2, width: 0.25, height: 0.1 }],
        },
      ],
    });
    const twoRecipients = await embedRecipientSignaturesInPdf({
      originalPdfBytes,
      recipients: [
        {
          signerName: "Ana Perez",
          signedAt,
          signaturePngBytes: tinyPng,
          placements: [{ pageNumber: 1, x: 0.1, y: 0.2, width: 0.25, height: 0.1 }],
        },
        {
          signerName: "Luis Lopez",
          signedAt,
          signaturePngBytes: tinyPng,
          placements: [{ pageNumber: 1, x: 0.55, y: 0.7, width: 0.25, height: 0.1 }],
        },
      ],
    });

    expect(twoRecipients.signedSha256).not.toBe(oneRecipient.signedSha256);
  });
});
