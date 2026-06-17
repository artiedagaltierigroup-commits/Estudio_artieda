import { describe, expect, it } from "vitest";
import { buildDefaultSignatureSubject, normalizeSignatureEmail } from "./signatures";

describe("signature action helpers", () => {
  it("builds a clear default subject", () => {
    expect(buildDefaultSignatureSubject("Contrato de honorarios")).toBe(
      "Solicitud de firma: Contrato de honorarios"
    );
  });

  it("normalizes recipient emails", () => {
    expect(normalizeSignatureEmail(" CLIENTE@MAIL.COM ")).toBe("cliente@mail.com");
  });
});
