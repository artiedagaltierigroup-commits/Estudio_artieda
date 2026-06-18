import { describe, expect, it } from "vitest";
import { buildEmailText, buildRecipientSignatureEmail, buildSigningUrl } from "./signature-email";

describe("signature email", () => {
  it("builds signing urls without duplicate slashes", () => {
    expect(buildSigningUrl("token-1", "https://app.test/")).toBe("https://app.test/firmar/token-1");
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
});
