import { describe, expect, it } from "vitest";
import {
  buildDefaultSignatureSubject,
  buildRecipientName,
  normalizeSignatureEmail,
  splitPersonName,
} from "./signatures-helpers";

describe("signature action helpers", () => {
  it("builds a clear default subject", () => {
    expect(buildDefaultSignatureSubject("Contrato de honorarios")).toBe(
      "Solicitud de firma: Contrato de honorarios"
    );
  });

  it("normalizes recipient emails", () => {
    expect(normalizeSignatureEmail(" CLIENTE@MAIL.COM ")).toBe("cliente@mail.com");
  });

  it("builds recipient names from first and last name", () => {
    expect(buildRecipientName({ firstName: " Walter ", lastName: " Galtieri " })).toBe("Walter Galtieri");
    expect(buildRecipientName({ firstName: "Walter", lastName: "" })).toBe("Walter");
  });

  it("splits client names into first and last name for autofill", () => {
    expect(splitPersonName("Walter Quimey Galtieri")).toEqual({
      firstName: "Walter",
      lastName: "Quimey Galtieri",
    });
  });
});
