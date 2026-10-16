import { describe, expect, it, vi } from "vitest";
import { buildInitialChargePayment } from "./charge-mutations";
import { getBusinessDate } from "./business-date";

describe("buildInitialChargePayment", () => {
  it("uses Argentina's calendar date after UTC midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T01:30:00Z"));
    try {
      expect(buildInitialChargePayment({ markAsPaid: true, amountTotal: "10" })?.paymentDate).toBe("2026-10-15");
    } finally {
      vi.useRealTimers();
    }
  });
  it("creates a full payment for today when markAsPaid is enabled", () => {
    const payment = buildInitialChargePayment({
      markAsPaid: true,
      amountTotal: "2500",
    });

    expect(payment).toEqual({
      amount: "2500",
      paymentDate: getBusinessDate(),
    });
  });

  it("returns null when markAsPaid is disabled", () => {
    expect(
      buildInitialChargePayment({
        markAsPaid: false,
        amountTotal: "2500",
      })
    ).toBeNull();
  });

  it("returns null when markAsPaid is omitted", () => {
    expect(
      buildInitialChargePayment({
        amountTotal: "2500",
      })
    ).toBeNull();
  });

  it("preserves the original amount string when creating the initial payment", () => {
    const payment = buildInitialChargePayment({
      markAsPaid: true,
      amountTotal: "2500.50",
    });

    expect(payment?.amount).toBe("2500.50");
  });
});
