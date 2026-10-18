import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  transactions: 0,
  schedule: {
    id: "406bd4b0-a4e4-45bf-891a-61269765db91",
    userId: "6f8631f5-2674-49b4-9d9a-27ac270d95c0",
    active: true,
    mode: "PAYABLE" as const,
    frequency: "monthly" as const,
    startDate: "2026-01-15",
    endDate: null,
    payableDayOfMonth: 15,
  },
  occurrences: [
    { recurringExpenseId: "406bd4b0-a4e4-45bf-891a-61269765db91", dueDate: "2026-01-15", status: "OVERDUE", expenseId: null },
    { recurringExpenseId: "406bd4b0-a4e4-45bf-891a-61269765db91", dueDate: "2026-02-15", status: "PAID", expenseId: "expense" },
    { recurringExpenseId: "406bd4b0-a4e4-45bf-891a-61269765db91", dueDate: "2026-03-15", status: "OVERDUE", expenseId: null },
    { recurringExpenseId: "406bd4b0-a4e4-45bf-891a-61269765db91", dueDate: "2026-04-15", status: "PENDING", expenseId: null },
  ],
}));

vi.mock("@/db", () => ({
  db: {
    query: { recurringExpenses: { findMany: async () => [state.schedule] } },
    select: () => ({ from: () => ({ where: async () => state.occurrences }) }),
    transaction: async () => { state.transactions++; throw new Error("No transaction needed for settled periods"); },
  },
}));

import { syncUserRecurringExpenseOccurrences } from "./recurring-expense-sync";

describe("recurring synchronization fast path", () => {
  it("does not open a transaction when every historical occurrence is already settled", async () => {
    state.transactions = 0;
    await syncUserRecurringExpenseOccurrences(state.schedule.userId, new Date("2026-03-20T12:00:00Z"));
    expect(state.transactions).toBe(0);
  });
});
