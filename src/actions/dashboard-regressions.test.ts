vi.mock("@/lib/workspace-access", () => ({ requireAdminAccess: async () => ({actorUserId:"owner",ownerUserId:"owner",role:"ADMIN"}) }));
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ charges: [] as any[], payments: [] as any[], expenses: [] as any[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/db", () => ({ db: { query: {
  charges: { findMany: async () => state.charges }, payments: { findMany: async () => state.payments }, expenses: { findMany: async () => state.expenses },
  reminders: { findMany: async () => [] }, cases: { findMany: async () => [] },
} } }));
vi.mock("./recurring-expenses", () => ({ getMonthlyProjection: async () => 100, getPendingRecurringProjection: async () => 100 }));
import { getDashboardMetrics } from "./dashboard";
beforeEach(() => { state.charges = []; state.payments = []; state.expenses = []; });
const range = { from: "2026-10-01", to: "2026-10-31" };
const ownCase = { id: "case", userId: "owner", clientId: "client", title: "Own case", client: { id: "client", userId: "owner", name: "Own client" } };
it("el neto real no vuelve a restar la proyección de un gasto materializado", async () => {
  state.expenses = [{ date: "2026-10-02", amount: "100" }];
  const result = await getDashboardMetrics(range);
  expect(result.periodExpenses).toBe(100);
  expect(result.netResult).toBe(-100);
});
it("el saldo de octubre incluye el anticipo cobrado en septiembre", async () => {
  const payment = { userId: "owner", chargeId: "charge", paymentDate: "2026-09-20", amount: "150" };
  state.charges = [{ id: "charge", userId: "owner", caseId: ownCase.id, amountTotal: "200", dueDate: "2026-10-15", payments: [payment], case: ownCase }];
  state.payments = [payment];
  const result = await getDashboardMetrics(range);
  expect(result.pendingIncome).toBe(50);
  expect(result.collectedIncome).toBe(0);
});
it("cobrar deuda de septiembre no reduce la deuda que vence en octubre", async () => {
  const payment = { userId: "owner", chargeId: "september-charge", paymentDate: "2026-10-03", amount: "150" };
  state.charges = [
    { id: "charge", userId: "owner", caseId: ownCase.id, amountTotal: "200", dueDate: "2026-10-15", payments: [], case: ownCase },
    { id: "september-charge", userId: "owner", caseId: ownCase.id, amountTotal: "150", dueDate: "2026-09-15", payments: [payment], case: ownCase },
  ];
  state.payments = [payment];
  const result = await getDashboardMetrics(range);
  expect(result.pendingIncome).toBe(200);
  expect(result.collectedIncome).toBe(150);
});
