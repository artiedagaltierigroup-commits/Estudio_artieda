import { describe, expect, it } from "vitest";
import { resolveRecurringStartDate } from "./recurring-expense-normalizers";

describe("resolveRecurringStartDate", () => {
  it("uses the creation date when an existing automatic recurring is converted to payable", () => {
    expect(
      resolveRecurringStartDate({
        mode: "PAYABLE",
        existingMode: "AUTOMATIC",
        existingStartDate: "2026-04-01",
        createdAt: "2026-03-28T03:42:06.501Z",
        today: new Date("2026-03-29T12:00:00.000Z"),
      })
    ).toBe("2026-03-28");
  });

  it("keeps the stored start date when the recurring was already payable", () => {
    expect(
      resolveRecurringStartDate({
        mode: "PAYABLE",
        existingMode: "PAYABLE",
        existingStartDate: "2026-03-28",
        createdAt: "2026-03-28T03:42:06.501Z",
        today: new Date("2026-03-29T12:00:00.000Z"),
      })
    ).toBe("2026-03-28");
  });

  it("keeps the submitted start date for automatic recurring expenses", () => {
    expect(
      resolveRecurringStartDate({
        mode: "AUTOMATIC",
        submittedStartDate: "2026-04-01",
        today: new Date("2026-03-29T12:00:00.000Z"),
      })
    ).toBe("2026-04-01");
  });
});
