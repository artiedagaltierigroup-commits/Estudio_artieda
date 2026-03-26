import { describe, expect, it } from "vitest";
import { buildInitialChargePayment } from "./charge-mutations";

describe("buildInitialChargePayment", () => {
  it("creates a full payment for today when markAsPaid is enabled", () => {
    const payment = buildInitialChargePayment({
      markAsPaid: true,
      amountTotal: "2500",
    });

    expect(payment).toEqual({
      amount: "2500",
      paymentDate: new Date().toISOString().slice(0, 10),
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
