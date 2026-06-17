import { describe, expect, it } from "vitest";
import { buildSignatureCertificateData } from "./signature-certificate";

describe("signature certificate", () => {
  it("summarizes request, signer, hashes, and events", () => {
    const data = buildSignatureCertificateData({
      requestId: "req-1",
      subject: "Solicitud de firma: Contrato",
      signerName: "Cliente Uno",
      signerEmail: "cliente@mail.com",
      originalSha256: "original",
      signedSha256: "signed",
      signedAt: new Date("2026-06-17T15:00:00Z"),
      events: [{ type: "signed", createdAt: new Date("2026-06-17T15:00:00Z") }],
    });

    expect(data.title).toBe("Constancia de firma electronica");
    expect(data.hashes.signedSha256).toBe("signed");
  });
});
