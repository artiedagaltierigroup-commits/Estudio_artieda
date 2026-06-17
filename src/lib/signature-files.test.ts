import { describe, expect, it } from "vitest";
import { buildSignedDocumentRetention, buildSignatureStoragePath, hashBufferSha256 } from "./signature-files";

describe("signature file utilities", () => {
  it("builds stable private storage paths", () => {
    expect(
      buildSignatureStoragePath({
        userId: "user-1",
        requestId: "request-1",
        kind: "original",
        fileName: "contrato.pdf",
      })
    ).toBe("user-1/signature-requests/request-1/original/contrato.pdf");
  });

  it("hashes buffers with sha256", async () => {
    const hash = await hashBufferSha256(Buffer.from("firmar"));
    expect(hash).toBe("758a7f95bd78e0e85898016c65deaa9313209f62d3887ee0a23ac54d13b6d873");
  });

  it("replaces the original PDF with the signed PDF after signing", () => {
    expect(
      buildSignedDocumentRetention({
        originalStoragePath: "user-1/signature-requests/request-1/original/contrato.pdf",
        signedStoragePath: "user-1/signature-requests/request-1/signed/firmado-contrato.pdf",
      })
    ).toEqual({
      originalStoragePath: "user-1/signature-requests/request-1/signed/firmado-contrato.pdf",
      storagePathsToDelete: ["user-1/signature-requests/request-1/original/contrato.pdf"],
    });
  });
});
