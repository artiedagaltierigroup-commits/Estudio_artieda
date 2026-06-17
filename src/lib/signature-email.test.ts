import { describe, expect, it } from "vitest";
import { buildEmailText, buildSigningUrl } from "./signature-email";

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

    expect(text).toContain("Revisar y firmar documento");
    expect(text).toContain("https://app.test/firmar/token-1");
  });
});
