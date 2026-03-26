import { describe, expect, it } from "vitest";
import { buildDemoWorkspaceSeed } from "./demo-seed";

describe("buildDemoWorkspaceSeed", () => {
  it("creates a coherent demo workspace bundle with linked entities", () => {
    const seed = buildDemoWorkspaceSeed("user-1", new Date("2026-03-17T12:00:00.000Z"));

    expect(seed.clients).toHaveLength(3);
    expect(seed.cases).toHaveLength(4);
    expect(seed.charges.length).toBeGreaterThanOrEqual(5);
    expect(seed.payments.length).toBeGreaterThanOrEqual(3);
    expect(seed.expenses.length).toBeGreaterThanOrEqual(4);
    expect(seed.recurringExpenses.length).toBeGreaterThanOrEqual(2);
    expect(seed.reminders.length).toBeGreaterThanOrEqual(4);

    const clientIds = new Set(seed.clients.map((item) => item.id));
    const caseIds = new Set(seed.cases.map((item) => item.id));
    const chargeIds = new Set(seed.charges.map((item) => item.id));

    expect(seed.cases.every((item) => clientIds.has(item.clientId))).toBe(true);
    expect(seed.charges.every((item) => caseIds.has(item.caseId))).toBe(true);
    expect(seed.payments.every((item) => chargeIds.has(item.chargeId))).toBe(true);
    expect(seed.reminders.some((item) => item.caseId !== null)).toBe(true);
    expect(seed.reminders.some((item) => item.clientId !== null)).toBe(true);
    expect(seed.reminders.some((item) => item.caseId === null && item.clientId === null)).toBe(true);
  });

  it("uses the provided user id on every record", () => {
    const seed = buildDemoWorkspaceSeed("user-2", new Date("2026-03-17T12:00:00.000Z"));
    const allRows = [
      ...seed.clients,
      ...seed.cases,
      ...seed.charges,
      ...seed.payments,
      ...seed.expenses,
      ...seed.recurringExpenses,
      ...seed.reminders,
    ];

    expect(new Set(allRows.map((item) => item.userId))).toEqual(new Set(["user-2"]));
  });
});
