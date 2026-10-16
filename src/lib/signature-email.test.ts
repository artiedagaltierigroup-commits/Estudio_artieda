import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEmailText,
  buildFinalCopyUrl,
  buildRecipientSignatureEmail,
  buildSignedDocumentCopyEmail,
  buildSigningUrl,
  sendSignatureRequestEmail,
} from "./signature-email";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("signature email", () => {
  it("fails closed without credentials and never logs the recipient or access token", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SIGNATURE_EMAIL_FROM", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(sendSignatureRequestEmail({ to: "private@example.invalid", subject: "Private", signingUrl: "https://example.invalid/secret-token" })).rejects.toThrow("configurado");
    expect(info).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("builds signing urls without duplicate slashes", () => {
    expect(buildSigningUrl("token-1", "https://app.test/")).toBe("https://app.test/firmar/token-1");
  });

  it("builds signing urls when the configured base url was pasted with angle brackets", () => {
    expect(buildSigningUrl("token-1", " <https://app.test/> ")).toBe("https://app.test/firmar/token-1");
  });

  it("builds plain text with the signing call to action", () => {
    const text = buildEmailText({
      subject: "Solicitud de firma: Contrato",
      message: "Por favor revisa el documento.",
      signingUrl: "https://app.test/firmar/token-1",
    });

    expect(text).toContain("Firmar solicitud");
    expect(text).toContain("https://app.test/firmar/token-1");
  });

  it("builds recipient-specific signing and tracking urls", () => {
    expect(
      buildRecipientSignatureEmail({
        recipientEmail: "ana@mail.com",
        subject: "Solicitud de firma",
        message: null,
        token: "recipient-token",
        baseUrl: "https://app.test/",
      })
    ).toMatchObject({
      to: "ana@mail.com",
      signingUrl: "https://app.test/firmar/recipient-token",
      emailOpenUrl: "https://app.test/api/signatures/email-open/recipient-token",
    });
  });

  it("builds the final signed copy download email", () => {
    expect(buildFinalCopyUrl("download-token", "https://app.test/")).toBe(
      "https://app.test/api/signatures/final-copy/download-token"
    );

    const email = buildSignedDocumentCopyEmail({
      recipientEmail: "ana@mail.com",
      subject: "Solicitud de firma: Contrato",
      token: "download-token",
      baseUrl: "https://app.test/",
    });

    expect(email).toMatchObject({
      to: "ana@mail.com",
      subject: "Documento firmado: Solicitud de firma: Contrato",
      signingUrl: "https://app.test/api/signatures/final-copy/download-token",
      ctaLabel: "Descargar documento firmado",
    });
    expect(buildEmailText(email)).toContain("Descargar documento firmado");
  });
});
