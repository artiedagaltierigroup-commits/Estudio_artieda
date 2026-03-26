import { describe, expect, it } from "vitest";
import {
  buildStatisticsTrendSeries,
  buildTopCasesByCollected,
  getComparisonDelta,
  getPreviousEquivalentRange,
} from "./statistics-insights";

describe("getPreviousEquivalentRange", () => {
  it("builds the previous contiguous range with the same length", () => {
    expect(getPreviousEquivalentRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-01-29",
      to: "2026-02-28",
    });
  });

  it("supports custom ranges shorter than a month", () => {
    expect(getPreviousEquivalentRange({ from: "2026-03-10", to: "2026-03-20" })).toEqual({
      from: "2026-02-27",
      to: "2026-03-09",
    });
  });
});

describe("getComparisonDelta", () => {
  it("returns the absolute and percentage delta against the previous period", () => {
    expect(getComparisonDelta(150000, 100000)).toEqual({
      amount: 50000,
      percentage: 50,
      direction: "up",
    });
  });

  it("handles previous values equal to zero without exploding", () => {
    expect(getComparisonDelta(80000, 0)).toEqual({
      amount: 80000,
      percentage: 100,
      direction: "up",
    });
  });

  it("reports flat comparisons when both values are zero", () => {
    expect(getComparisonDelta(0, 0)).toEqual({
      amount: 0,
      percentage: 0,
      direction: "flat",
    });
  });

  it("supports negative deltas against a non-zero previous period", () => {
    expect(getComparisonDelta(50, 100)).toEqual({
      amount: -50,
      percentage: -50,
      direction: "down",
    });
  });
});

describe("buildTopCasesByCollected", () => {
  it("groups case collections and sorts from higher to lower", () => {
    expect(
      buildTopCasesByCollected([
        { caseId: "1", caseTitle: "Contrato", clientName: "Walter", collected: 50000 },
        { caseId: "2", caseTitle: "Daños", clientName: "Ana", collected: 120000 },
        { caseId: "1", caseTitle: "Contrato", clientName: "Walter", collected: 15000 },
      ])
    ).toEqual([
      { caseId: "2", caseTitle: "Daños", clientName: "Ana", collected: 120000 },
      { caseId: "1", caseTitle: "Contrato", clientName: "Walter", collected: 65000 },
    ]);
  });
});

describe("buildStatisticsTrendSeries", () => {
  it("builds a daily trend for ranges up to 31 days and preserves empty days", () => {
    expect(
      buildStatisticsTrendSeries({
        from: "2026-03-10",
        to: "2026-03-12",
        payments: [
          { paymentDate: "2026-03-10", amount: 80 },
          { paymentDate: "2026-03-10", amount: 20 },
          { paymentDate: "2026-03-12", amount: 250 },
        ],
        expenses: [{ date: "2026-03-11", amount: 30 }],
      })
    ).toEqual([
      { label: "10 mar", grossIncome: 100, expenses: 0 },
      { label: "11 mar", grossIncome: 0, expenses: 30 },
      { label: "12 mar", grossIncome: 250, expenses: 0 },
    ]);
  });

  it("aggregates by month for longer ranges", () => {
    expect(
      buildStatisticsTrendSeries({
        from: "2026-01-10",
        to: "2026-03-20",
        payments: [
          { paymentDate: "2026-01-12", amount: 100 },
          { paymentDate: "2026-03-01", amount: 50 },
        ],
        expenses: [
          { date: "2026-02-10", amount: 25 },
          { date: "2026-03-15", amount: 10 },
        ],
      })
    ).toEqual([
      { label: "ene 26", grossIncome: 100, expenses: 0 },
      { label: "feb 26", grossIncome: 0, expenses: 25 },
      { label: "mar 26", grossIncome: 50, expenses: 10 },
    ]);
  });
});
