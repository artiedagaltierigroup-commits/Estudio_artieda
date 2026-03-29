import { describe, expect, it } from "vitest";

import { buildAutomaticRecurringOverview } from "./automatic-recurring-overview";

describe("buildAutomaticRecurringOverview", () => {
  it("orders active automatic recurring expenses by their next due date", () => {
    const items = buildAutomaticRecurringOverview(
      [
        {
          id: "b",
          userId: "user",
          description: "Internet",
          amount: "30000",
          type: "SERVICE",
          mode: "AUTOMATIC",
          priority: "MEDIUM",
          category: "Servicios",
          frequency: "monthly",
          startDate: "2026-03-20",
          endDate: null,
          notifyDaysBefore: 0,
          payableDayOfMonth: null,
          active: true,
          notes: null,
          createdAt: new Date("2026-03-01T12:00:00.000Z"),
          updatedAt: new Date("2026-03-01T12:00:00.000Z"),
        },
        {
          id: "a",
          userId: "user",
          description: "Sistema",
          amount: "15000",
          type: "OPERATIVE",
          mode: "AUTOMATIC",
          priority: "MEDIUM",
          category: "Software",
          frequency: "monthly",
          startDate: "2026-03-10",
          endDate: null,
          notifyDaysBefore: 0,
          payableDayOfMonth: null,
          active: true,
          notes: null,
          createdAt: new Date("2026-03-01T12:00:00.000Z"),
          updatedAt: new Date("2026-03-01T12:00:00.000Z"),
        },
      ],
      new Date("2026-03-09T12:00:00.000Z")
    );

    expect(items.map((item) => item.description)).toEqual(["Sistema", "Internet"]);
    expect(items[0]).toMatchObject({
      nextDueDate: "2026-03-10",
      dueThisMonth: true,
      daysUntilNextDue: 1,
    });
  });

  it("ignores inactive and payable recurring expenses", () => {
    const items = buildAutomaticRecurringOverview(
      [
        {
          id: "payable",
          userId: "user",
          description: "Alquiler",
          amount: "500000",
          type: "OPERATIVE",
          mode: "PAYABLE",
          priority: "HIGH",
          category: "Oficina",
          frequency: "monthly",
          startDate: "2026-03-01",
          endDate: null,
          notifyDaysBefore: 5,
          payableDayOfMonth: 10,
          active: true,
          notes: null,
          createdAt: new Date("2026-03-01T12:00:00.000Z"),
          updatedAt: new Date("2026-03-01T12:00:00.000Z"),
        },
        {
          id: "inactive",
          userId: "user",
          description: "Seguro",
          amount: "12000",
          type: "SERVICE",
          mode: "AUTOMATIC",
          priority: "LOW",
          category: "Varios",
          frequency: "monthly",
          startDate: "2026-03-15",
          endDate: null,
          notifyDaysBefore: 0,
          payableDayOfMonth: null,
          active: false,
          notes: null,
          createdAt: new Date("2026-03-01T12:00:00.000Z"),
          updatedAt: new Date("2026-03-01T12:00:00.000Z"),
        },
      ],
      new Date("2026-03-09T12:00:00.000Z")
    );

    expect(items).toEqual([]);
  });
});
