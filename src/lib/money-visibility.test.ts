import { describe, expect, it } from "vitest";
import {
  formatDisplayCurrency,
  getInitialMoneyHidden,
  MONEY_MASK,
  MONEY_VISIBILITY_STORAGE_KEY,
} from "./money-visibility";

describe("formatDisplayCurrency", () => {
  it("returns the formatted currency when money is visible", () => {
    expect(formatDisplayCurrency(1234567, false)).toContain("1.234.567");
  });

  it("returns the mask when money is hidden", () => {
    expect(formatDisplayCurrency(1234567, true)).toBe(MONEY_MASK);
  });

  it("handles string and empty values without breaking", () => {
    expect(formatDisplayCurrency("2500.50", false)).toContain("2.500,5");
    expect(formatDisplayCurrency(null, false)).toBe("$0");
    expect(formatDisplayCurrency(undefined, false)).toBe("$0");
  });
});

describe("getInitialMoneyHidden", () => {
  it("returns false when there is no saved preference", () => {
    expect(getInitialMoneyHidden(null)).toBe(false);
    expect(getInitialMoneyHidden(undefined)).toBe(false);
  });

  it("restores a saved hidden preference from storage", () => {
    expect(getInitialMoneyHidden("true")).toBe(true);
    expect(getInitialMoneyHidden("false")).toBe(false);
  });

  it("uses a stable localStorage key for the dashboard toggle", () => {
    expect(MONEY_VISIBILITY_STORAGE_KEY).toBe("estudio-artieda-money-hidden");
  });
});
