import { describe, expect, it } from "vitest";
import { filterChargesByFilters, summarizeChargeRecord } from "./charge-insights";

describe("summarizeChargeRecord", () => {
  it("derives amount paid, balance and status from payments and cancellation", () => {
    expect(
      summarizeChargeRecord({
        amountTotal: "100000",
        dueDate: "2099-03-20",
        cancelledAt: null,
        payments: [{ amount: "25000" }],
      })
    ).toMatchObject({
      amountPaid: 25000,
      balance: 75000,
      derivedStatus: "PARTIAL",
    });

    expect(
      summarizeChargeRecord({
        amountTotal: "100000",
        dueDate: "2000-03-20",
        cancelledAt: "2026-03-17T10:00:00.000Z",
        payments: [],
      }).derivedStatus
    ).toBe("CANCELLED");
  });

  it("sums multiple payments and clamps balance at zero", () => {
    expect(
      summarizeChargeRecord({
        amountTotal: "100000",
        dueDate: "2099-03-20",
        cancelledAt: null,
        payments: [{ amount: "25000" }, { amount: "25000" }, { amount: "60000" }],
      })
    ).toMatchObject({
      amountPaid: 110000,
      balance: 0,
      derivedStatus: "PAID",
    });
  });
});

describe("filterChargesByFilters", () => {
  const items = [
    {
      description: "Cuota 1",
      case: { title: "Sucesion Perez", client: { name: "Ana Perez" } },
      derivedStatus: "PARTIAL",
    },
    {
      description: "Saldo final",
      case: { title: "Reajuste Diaz", client: { name: "Bruno Diaz" } },
      derivedStatus: "OVERDUE",
    },
  ];

  it("filters by search text and derived charge status", () => {
    expect(filterChargesByFilters(items, { query: "perez" })).toHaveLength(1);
    expect(filterChargesByFilters(items, { query: "saldo" })).toHaveLength(1);
    expect(filterChargesByFilters(items, { status: "OVERDUE" })).toHaveLength(1);
  });

  it("supports combined filters and returns empty results when nothing matches", () => {
    expect(filterChargesByFilters(items, { query: "diaz", status: "OVERDUE" })).toHaveLength(1);
    expect(filterChargesByFilters(items, { query: "perez", status: "OVERDUE" })).toHaveLength(0);
  });
});
