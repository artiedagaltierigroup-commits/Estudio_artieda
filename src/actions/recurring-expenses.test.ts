import { describe, expect, it } from "vitest";
import { calculateMonthlyProjection } from "../lib/recurring-expense-projection";

describe("calculateMonthlyProjection", () => {
  it("includes active monthly, quarterly and yearly expenses when they hit the target month", () => {
    const total = calculateMonthlyProjection(
      [
        { amount: "100", active: true, frequency: "monthly", startDate: "2026-01-10", endDate: null },
        { amount: "200", active: true, frequency: "quarterly", startDate: "2026-01-05", endDate: null },
        { amount: "300", active: true, frequency: "yearly", startDate: "2025-03-02", endDate: null },
      ],
      new Date("2026-03-01T00:00:00.000Z")
    );

    expect(total).toBe(400);
  });

  it("ignores inactive rows and rows outside the active date window", () => {
    const total = calculateMonthlyProjection(
      [
        { amount: "100", active: false, frequency: "monthly", startDate: "2026-01-10", endDate: null },
        { amount: "200", active: true, frequency: "monthly", startDate: "2026-04-01", endDate: null },
        { amount: "300", active: true, frequency: "monthly", startDate: "2026-01-01", endDate: "2026-02-28" },
      ],
      new Date("2026-03-01T00:00:00.000Z")
    );

    expect(total).toBe(0);
  });

  it("handles boundary months for quarterly recurrences", () => {
    expect(
      calculateMonthlyProjection(
        [{ amount: "250", active: true, frequency: "quarterly", startDate: "2026-01-15", endDate: null }],
        new Date("2026-04-01T00:00:00.000Z")
      )
    ).toBe(250);

    expect(
      calculateMonthlyProjection(
        [{ amount: "250", active: true, frequency: "quarterly", startDate: "2026-01-15", endDate: null }],
        new Date("2026-05-01T00:00:00.000Z")
      )
    ).toBe(0);
  });
});
