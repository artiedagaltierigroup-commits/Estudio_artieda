import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  charges: [] as any[], payments: [] as any[], reminders: [] as any[], cases: [] as any[], clients: [] as any[],
}));
vi.mock("@/lib/workspace-access", () => ({ requireAdminAccess: async () => ({ actorUserId: "owner", ownerUserId: "owner", role: "ADMIN" }) }));
vi.mock("@/db", () => ({ db: { query: {
  charges: { findMany: async () => state.charges },
  payments: { findMany: async () => state.payments },
  reminders: { findMany: async () => state.reminders },
  cases: { findMany: async () => state.cases },
  clients: { findMany: async () => state.clients },
  expenses: { findMany: async () => [] },
  recurringExpenses: { findMany: async () => [] },
} } }));
vi.mock("./recurring-expenses", () => ({ getPendingRecurringProjection: async () => 0 }));

import { getCalendarEvents } from "./calendar";
import { getAnalyticsSnapshot, getDashboardOverview, getStatisticsFilterOptions, getStatisticsSnapshot } from "./dashboard";

const range = { from: "2026-10-01", to: "2026-10-31" };
const ownClient = { id: "client", userId: "owner", name: "Own client" };
const ownCase = { id: "case", userId: "owner", title: "Own case", clientId: ownClient.id, client: ownClient, status: "ACTIVE" };
const ownCharge = { id: "charge", userId: "owner", caseId: ownCase.id, case: ownCase, payments: [], description: "Own charge", amountTotal: "100", dueDate: "2026-10-20", createdAt: new Date("2026-10-01T12:00:00Z") };
const ownReminder = { id: "reminder", userId: "owner", title: "Own reminder", reminderDate: new Date("2026-10-20T12:00:00Z"), priority: "HIGH", completed: false, caseId: ownCase.id, case: ownCase, clientId: ownClient.id, client: ownClient };

describe("admin calendar and financial overview preserve nested ownership", () => {
  beforeEach(() => {
    state.charges = []; state.payments = []; state.reminders = []; state.cases = []; state.clients = [];
  });

  it.each(["case", "client"])("does not expose a charge linked to a foreign %s in calendar or any overview", async (foreign) => {
    const linkedCase = foreign === "case"
      ? { ...ownCase, userId: "other", title: "Private case" }
      : { ...ownCase, client: { ...ownClient, userId: "other", name: "Private client" } };
    state.charges = [{ ...ownCharge, case: linkedCase }];
    state.payments = [{ id: "payment", userId: "owner", chargeId: "charge", amount: "10", paymentDate: "2026-10-02" }];
    expect(await getCalendarEvents(range.from, range.to)).toEqual([]);
    const overview = await getDashboardOverview(range);
    expect(overview.upcomingCharges).toEqual([]); expect(overview.debtClients).toEqual([]);
    expect(overview.metrics.expectedIncome).toBe(0); expect(overview.metrics.collectedIncome).toBe(0);
    const statistics = await getStatisticsSnapshot(range);
    expect(statistics.topClients).toEqual([]); expect(statistics.metrics.pendingIncome.current).toBe(0);
    expect((await getAnalyticsSnapshot(1)).topClients).toEqual([]);
  });

  it("excludes foreign and mislinked payments before computing debt, collected totals and statistics", async () => {
    const payments = [
      { id: "own", userId: "owner", chargeId: "charge", amount: "20", paymentDate: "2026-10-02" },
      { id: "foreign", userId: "other", chargeId: "charge", amount: "700", paymentDate: "2026-10-02" },
      { id: "mislinked", userId: "owner", chargeId: "other-charge", amount: "800", paymentDate: "2026-10-02" },
    ];
    state.charges = [{ ...ownCharge, payments }]; state.payments = payments;
    const overview = await getDashboardOverview(range);
    expect(overview.metrics.pendingIncome).toBe(80);
    expect(overview.metrics.collectedIncome).toBe(20);
    expect(overview.debtClients).toMatchObject([{ clientName: "Own client", collected: 20, balance: 80 }]);
    const statistics = await getStatisticsSnapshot(range);
    expect(statistics.metrics.collectedIncome.current).toBe(20);
    expect(statistics.metrics.pendingIncome.current).toBe(80);
  });

  it.each(["case", "client", "case-client"])("excludes a reminder related to a foreign %s before rendering labels or counting it", async (foreign) => {
    state.reminders = [{ ...ownReminder,
      case: foreign === "case" ? { ...ownCase, userId: "other", title: "Private case" }
        : foreign === "case-client" ? { ...ownCase, client: { ...ownClient, userId: "other" } } : ownCase,
      client: foreign === "client" ? { ...ownClient, userId: "other", name: "Private client" } : ownClient,
    }];
    const result = await getDashboardOverview(range);
    expect(result.urgentReminders).toEqual([]);
    expect(result.metrics.openReminders).toBe(0);
  });

  it("omits cases with foreign clients from counts and statistics filters", async () => {
    state.cases = [{ ...ownCase, client: { ...ownClient, userId: "other", name: "Private client" } }];
    expect((await getDashboardOverview(range)).metrics.activeCases).toBe(0);
    expect((await getStatisticsFilterOptions()).cases).toEqual([]);
  });

  it("keeps valid own charges, cases, reminders and unlinked reminders available", async () => {
    state.charges = [ownCharge]; state.cases = [ownCase]; state.clients = [ownClient];
    state.reminders = [ownReminder, { ...ownReminder, id: "unlinked", caseId: null, case: null, clientId: null, client: null }];
    const result = await getDashboardOverview(range);
    expect(result.metrics.expectedIncome).toBe(100); expect(result.metrics.activeCases).toBe(1); expect(result.metrics.openReminders).toBe(2);
    expect(result.upcomingCharges).toMatchObject([{ id: "charge", clientName: "Own client", caseTitle: "Own case" }]);
    expect(result.urgentReminders).toHaveLength(2);
    expect((await getCalendarEvents(range.from, range.to)).some((event) => event.id === "charge-charge" && event.subtitle === "Own client")).toBe(true);
    expect((await getStatisticsFilterOptions()).cases).toEqual([{ id: "case", title: "Own case", clientId: "client", clientName: "Own client" }]);
  });
});
