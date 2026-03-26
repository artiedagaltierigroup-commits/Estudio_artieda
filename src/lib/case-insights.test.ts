import { describe, expect, it } from "vitest";
import { filterCasesByFilters, getCasePendingBalance, summarizeCaseFinance } from "./case-insights";

describe("summarizeCaseFinance", () => {
  it("aggregates totals, derived statuses and next due date", () => {
    const summary = summarizeCaseFinance([
      {
        amountTotal: "100000",
        dueDate: "2099-04-10",
        cancelledAt: null,
        payments: [{ amount: "25000" }],
      },
      {
        amountTotal: "40000",
        dueDate: "2000-03-01",
        cancelledAt: null,
        payments: [],
      },
      {
        amountTotal: "30000",
        dueDate: "2099-05-01",
        cancelledAt: "2026-03-17T10:00:00.000Z",
        payments: [],
      },
    ]);

    expect(summary.expected).toBe(140000);
    expect(summary.collected).toBe(25000);
    expect(summary.balance).toBe(115000);
    expect(summary.overdue).toBe(1);
    expect(summary.partial).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.openCharges).toBe(2);
    expect(summary.nextDueDate).toBe("2000-03-01");
  });

  it("returns a cancelled dominant status when every charge is cancelled", () => {
    const summary = summarizeCaseFinance([
      {
        amountTotal: "100000",
        dueDate: "2099-04-10",
        cancelledAt: "2026-03-17T10:00:00.000Z",
        payments: [],
      },
    ]);

    expect(summary.expected).toBe(0);
    expect(summary.balance).toBe(0);
    expect(summary.openCharges).toBe(0);
    expect(summary.dominantStatus).toBe("CANCELLED");
  });
});

describe("filterCasesByFilters", () => {
  const items = [
    {
      title: "Sucesion Perez",
      status: "ACTIVE",
      client: { name: "Ana Perez" },
      financeSummary: { dominantStatus: "PARTIAL" as const },
      latestDueDate: "2026-03-20",
    },
    {
      title: "Reajuste Diaz",
      status: "SUSPENDED",
      client: { name: "Bruno Diaz" },
      financeSummary: { dominantStatus: "OVERDUE" as const },
      latestDueDate: "2026-04-12",
    },
  ];

  it("filters by search text, case status and charge state", () => {
    expect(filterCasesByFilters(items, { query: "perez" })).toHaveLength(1);
    expect(filterCasesByFilters(items, { status: "SUSPENDED" })).toHaveLength(1);
    expect(filterCasesByFilters(items, { chargeStatus: "OVERDUE" })).toHaveLength(1);
  });

  it("supports combined filters and excludes non matching cases", () => {
    expect(filterCasesByFilters(items, { query: "diaz", status: "SUSPENDED", chargeStatus: "OVERDUE" })).toHaveLength(1);
    expect(filterCasesByFilters(items, { query: "diaz", status: "ACTIVE", chargeStatus: "OVERDUE" })).toHaveLength(0);
  });
});

describe("getCasePendingBalance", () => {
  it("prioritizes fee minus collected when the case has agreed fees", () => {
    expect(getCasePendingBalance("50000", 2500, 0)).toBe(47500);
  });

  it("falls back to financial summary balance when fee is not defined", () => {
    expect(getCasePendingBalance(null, 2500, 18000)).toBe(18000);
  });

  it("never returns a negative pending balance", () => {
    expect(getCasePendingBalance("5000", 8000, 0)).toBe(0);
  });
});
