import { describe, expect, it } from "vitest";

import {
  buildRecurringPayableChecklist,
  getRecurringPayableChecklistRange,
  isRecurringPayableAlertVisible,
} from "./recurring-expense-checklist";

describe("recurring payable checklist", () => {
  it("uses the full real month as the checklist range", () => {
    expect(getRecurringPayableChecklistRange(new Date("2026-06-01T12:00:00.000Z"))).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("keeps current-month payable rows visible before their alert window starts", () => {
    const checklist = buildRecurringPayableChecklist([
      {
        occurrenceId: "occ-1",
        recurringId: "rec-1",
        description: "Alquiler oficina",
        amount: "500000",
        dueDate: "2026-06-25",
        status: "PENDING",
        paidAt: null,
        expenseId: null,
        type: "OPERATIVE",
        category: "Oficina",
        priority: "HIGH",
        notifyDaysBefore: 5,
      },
    ]);

    expect(checklist.pending).toHaveLength(1);
    expect(checklist.pending[0].description).toBe("Alquiler oficina");
    expect(checklist.summary).toEqual({ pending: 1, overdue: 0, paid: 0 });
  });

  it("keeps reminder alerts limited to the configured alert window", () => {
    const row = {
      dueDate: "2026-06-25",
      status: "PENDING" as const,
      notifyDaysBefore: 5,
    };

    expect(isRecurringPayableAlertVisible(row, "2026-06-01")).toBe(false);
    expect(isRecurringPayableAlertVisible(row, "2026-06-20")).toBe(true);
  });
});
