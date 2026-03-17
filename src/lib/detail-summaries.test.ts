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
});
