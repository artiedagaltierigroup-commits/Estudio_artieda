import { describe, expect, it } from "vitest";
import { summarizeCaseCharges, summarizeClientCases } from "./detail-summaries";

describe("summarizeClientCases", () => {
  it("counts client cases by status", () => {
    expect(
      summarizeClientCases([
        { status: "ACTIVE" },
        { status: "ACTIVE" },
        { status: "SUSPENDED" },
        { status: "CLOSED" },
      ])
    ).toEqual({
      total: 4,
      active: 2,
      suspended: 1,
      closed: 1,
    });
  });

  it("returns zeroed counters for an empty client portfolio", () => {
    expect(summarizeClientCases([])).toEqual({
      total: 0,
      active: 0,
      suspended: 0,
      closed: 0,
    });
  });
});

describe("summarizeCaseCharges", () => {
  it("aggregates totals and derived status counts", () => {
    const summary = summarizeCaseCharges([
      {
        amountTotal: "100000",
        dueDate: "2099-01-01",
        payments: [{ amount: "25000" }],
      },
      {
        amountTotal: "50000",
        dueDate: "2099-02-01",
        payments: [{ amount: "50000" }],
      },
      {
        amountTotal: "80000",
        dueDate: "2000-01-01",
        payments: [],
      },
    ]);

    expect(summary).toEqual({
      total: 3,
      expected: 230000,
      collected: 75000,
      balance: 155000,
      overdue: 1,
      partial: 1,
      paid: 1,
      pending: 0,
    });
  });

  it("ignores cancelled charges in financial totals and status counters", () => {
    const summary = summarizeCaseCharges([
      {
        amountTotal: "100000",
        dueDate: "2099-01-01",
        cancelledAt: "2026-03-17T10:00:00.000Z",
        payments: [{ amount: "10000" }],
      },
    ]);

    expect(summary).toEqual({
      total: 1,
      expected: 0,
      collected: 0,
      balance: 0,
      overdue: 0,
      partial: 0,
      paid: 0,
      pending: 0,
    });
  });
});
