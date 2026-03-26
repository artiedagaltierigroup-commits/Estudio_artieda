import { describe, expect, it } from "vitest";
import { buildExpenseMonthBoard, filterExpensesByFilters, summarizeExpenseMetrics } from "./expense-insights";

describe("summarizeExpenseMetrics", () => {
  it("aggregates totals and active recurring counts", () => {
    const summary = summarizeExpenseMetrics({
      expenses: [
        { amount: "10000", type: "OPERATIVE" },
        { amount: "20000", type: "TAX" },
      ],
      recurring: [
        { amount: "15000", active: true },
        { amount: "8000", active: false },
      ],
    });

    expect(summary.totalExpenses).toBe(30000);
    expect(summary.totalRecurringActive).toBe(15000);
    expect(summary.operativeCount).toBe(1);
    expect(summary.taxCount).toBe(1);
    expect(summary.activeRecurringCount).toBe(1);
  });

  it("returns zeroed totals when there are no expenses or active recurring entries", () => {
    expect(
      summarizeExpenseMetrics({
        expenses: [],
        recurring: [{ amount: "15000", active: false }],
      })
    ).toEqual({
      totalExpenses: 0,
      totalRecurringActive: 0,
      operativeCount: 0,
      taxCount: 0,
      activeRecurringCount: 0,
    });
  });
});

describe("filterExpensesByFilters", () => {
  const items = [
    { description: "Papeleria", type: "OPERATIVE", category: "Oficina" },
    { description: "Monotributo", type: "TAX", category: "Impuestos" },
  ];

  it("filters by search text and type", () => {
    expect(filterExpensesByFilters(items, { query: "papel" })).toHaveLength(1);
    expect(filterExpensesByFilters(items, { query: "impuestos" })).toHaveLength(1);
    expect(filterExpensesByFilters(items, { type: "TAX" })).toHaveLength(1);
  });

  it("supports combined filters and returns empty results when nothing matches", () => {
    expect(filterExpensesByFilters(items, { query: "impuestos", type: "TAX" })).toHaveLength(1);
    expect(filterExpensesByFilters(items, { query: "impuestos", type: "OPERATIVE" })).toHaveLength(0);
  });
});

describe("buildExpenseMonthBoard", () => {
  it("separates real and projected month balances", () => {
    const board = buildExpenseMonthBoard({
      expectedIncome: 200,
      collectedIncome: 100,
      periodExpenses: 150,
    });

    expect(board.realAvailable).toBe(-50);
    expect(board.projectedAvailable).toBe(50);
    expect(board.pendingToCollect).toBe(100);
  });

  it("caps spending share at 100 and avoids division by zero", () => {
    expect(
      buildExpenseMonthBoard({
        expectedIncome: 100,
        collectedIncome: 50,
        periodExpenses: 200,
      }).spentShareOfCollected
    ).toBe(100);

    expect(
      buildExpenseMonthBoard({
        expectedIncome: 100,
        collectedIncome: 0,
        periodExpenses: 200,
      }).spentShareOfCollected
    ).toBe(0);
  });
});
