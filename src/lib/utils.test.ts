import { describe, expect, it } from "vitest";
import { deriveChargeStatus, formatCurrency, formatMoneyInput, getChargeStatusLabel, normalizeMoneyValue } from "./utils";

describe("deriveChargeStatus", () => {
  it("prioritizes cancellation over payment and due date logic", () => {
    expect(deriveChargeStatus("100000", "25000", "2000-01-01", "2026-03-17T10:00:00.000Z")).toBe("CANCELLED");
  });

  it("derives overdue, partial, paid and pending states from source data", () => {
    expect(deriveChargeStatus("100000", "0", "2000-01-01")).toBe("OVERDUE");
    expect(deriveChargeStatus("100000", "25000", "2099-01-01")).toBe("PARTIAL");
    expect(deriveChargeStatus("100000", "100000", "2099-01-01")).toBe("PAID");
    expect(deriveChargeStatus("100000", "0", "2099-01-01")).toBe("PENDING");
  });

  it("keeps partial and pending states when there is no due date", () => {
    expect(deriveChargeStatus("100000", "25000", null)).toBe("PARTIAL");
    expect(deriveChargeStatus("100000", "0", null)).toBe("PENDING");
  });

  it("prioritizes full payment over an overdue due date", () => {
    expect(deriveChargeStatus("100000", "100000", "2000-01-01")).toBe("PAID");
  });
});

describe("getChargeStatusLabel", () => {
  it("returns the localized label for cancelled charges", () => {
    expect(getChargeStatusLabel("CANCELLED")).toBe("Cancelado");
  });

  it("falls back to the original status when no translation exists", () => {
    expect(getChargeStatusLabel("MANUAL_REVIEW")).toBe("MANUAL_REVIEW");
  });
});

describe("money formatting", () => {
  it("formats pesos with Argentine separators", () => {
    expect(formatCurrency(1234567)).toContain("1.234.567");
  });

  it("normalizes decimal strings from the database into integer pesos", () => {
    expect(normalizeMoneyValue("2500.00")).toBe("2500");
    expect(normalizeMoneyValue("1.250")).toBe("1250");
  });

  it("normalizes empty, comma and prefixed values consistently", () => {
    expect(normalizeMoneyValue("")).toBe("");
    expect(normalizeMoneyValue("001250")).toBe("1250");
    expect(normalizeMoneyValue("2500,49")).toBe("2500");
  });

  it("formats live money input in es-AR style", () => {
    expect(formatMoneyInput("1250000")).toBe("1.250.000");
  });
});
