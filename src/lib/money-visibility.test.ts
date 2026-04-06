import { describe, expect, it } from "vitest";
import { formatDisplayCurrency, MONEY_MASK } from "./money-visibility";

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
