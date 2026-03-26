import { describe, expect, it } from "vitest";
import {
  buildExpensesByCategory,
  buildChargeStatusBreakdown,
  buildMonthlyNetSeries,
  buildTopDebtClients,
  buildTopPendingCases,
  buildTopClients,
  pickUpcomingCharges,
  pickUrgentReminders,
} from "./analytics-insights";

describe("pickUpcomingCharges", () => {
  it("sorts open charges by due date and excludes paid/cancelled", () => {
    const result = pickUpcomingCharges([
      { id: "1", description: "Cuota 1", dueDate: "2099-03-10", derivedStatus: "PENDING", balance: 1000 },
      { id: "2", description: "Cuota 2", dueDate: "2099-03-05", derivedStatus: "OVERDUE", balance: 500 },
      { id: "3", description: "Cuota 3", dueDate: "2099-03-01", derivedStatus: "PAID", balance: 0 },
      { id: "4", description: "Cuota 4", dueDate: "2099-03-03", derivedStatus: "CANCELLED", balance: 0 },
    ]);

    expect(result.map((item) => item.id)).toEqual(["2", "1"]);
  });
});

describe("pickUrgentReminders", () => {
  it("keeps open reminders sorted by date and priority", () => {
    const result = pickUrgentReminders([
      { id: "1", title: "Llamar", reminderDate: "2099-03-03T10:00:00.000Z", completed: false, priority: "MEDIUM" },
      { id: "2", title: "Vence", reminderDate: "2099-03-02T10:00:00.000Z", completed: false, priority: "HIGH" },
      { id: "3", title: "Resuelto", reminderDate: "2099-03-01T10:00:00.000Z", completed: true, priority: "HIGH" },
    ]);

    expect(result.map((item) => item.id)).toEqual(["2", "1"]);
  });

  it("breaks ties on the same day by priority", () => {
    const result = pickUrgentReminders([
      { id: "low", title: "Baja", reminderDate: "2099-03-02T10:00:00.000Z", completed: false, priority: "LOW" },
      { id: "high", title: "Alta", reminderDate: "2099-03-02T10:00:00.000Z", completed: false, priority: "HIGH" },
    ]);

    expect(result.map((item) => item.id)).toEqual(["high", "low"]);
  });
});

describe("buildTopClients", () => {
  it("aggregates clients by collected and balance", () => {
    const result = buildTopClients([
      { clientId: "a", clientName: "Ana", collected: 1000, balance: 500 },
      { clientId: "a", clientName: "Ana", collected: 300, balance: 100 },
      { clientId: "b", clientName: "Bruno", collected: 500, balance: 800 },
    ]);

    expect(result[0]).toEqual({ clientId: "a", clientName: "Ana", collected: 1300, balance: 600 });
    expect(result[1]).toEqual({ clientId: "b", clientName: "Bruno", collected: 500, balance: 800 });
  });
});

describe("buildChargeStatusBreakdown", () => {
  it("counts derived statuses including cancelled", () => {
    expect(buildChargeStatusBreakdown(["PENDING", "PARTIAL", "OVERDUE", "PAID", "CANCELLED", "PENDING"])).toEqual({
      PENDING: 2,
      PARTIAL: 1,
      PAID: 1,
      OVERDUE: 1,
      CANCELLED: 1,
    });
  });
});

describe("buildMonthlyNetSeries", () => {
  it("merges income and expenses by month into net series", () => {
    const result = buildMonthlyNetSeries(
      [
        { month: "2026-01", total: 1000 },
        { month: "2026-02", total: 500 },
      ],
      [
        { month: "2026-01", total: 300 },
        { month: "2026-03", total: 200 },
      ]
    );

    expect(result).toEqual([
      { month: "2026-01", income: 1000, expenses: 300, net: 700 },
      { month: "2026-02", income: 500, expenses: 0, net: 500 },
      { month: "2026-03", income: 0, expenses: 200, net: -200 },
    ]);
  });
});

describe("buildExpensesByCategory", () => {
  it("groups expense totals by category and merges the tail into Otras", () => {
    const result = buildExpensesByCategory(
      [
        { category: "Impuestos", amount: 3000 },
        { category: "Transporte", amount: 2000 },
        { category: "Software y suscripciones", amount: 1500 },
        { category: "Comida y viaticos", amount: 800 },
        { category: "Varios", amount: 700 },
      ],
      3
    );

    expect(result).toEqual([
      { name: "Impuestos", value: 3000, percentage: 38 },
      { name: "Transporte", value: 2000, percentage: 25 },
      { name: "Software y suscripciones", value: 1500, percentage: 19 },
      { name: "Otras", value: 1500, percentage: 19 },
    ]);
  });

  it("returns an empty collection when there are no expenses to aggregate", () => {
    expect(buildExpensesByCategory([])).toEqual([]);
  });
});

describe("buildTopDebtClients", () => {
  it("sorts only clients with debt by pending balance", () => {
    const result = buildTopDebtClients([
      { clientId: "a", clientName: "Ana", collected: 1000, balance: 0 },
      { clientId: "b", clientName: "Bruno", collected: 500, balance: 1200 },
      { clientId: "c", clientName: "Carla", collected: 200, balance: 800 },
    ]);

    expect(result.map((item) => item.clientId)).toEqual(["b", "c"]);
  });
});

describe("buildTopPendingCases", () => {
  it("groups and sorts cases by pending balance", () => {
    const result = buildTopPendingCases([
      { caseId: "1", caseTitle: "Caso A", clientName: "Ana", pendingBalance: 500 },
      { caseId: "1", caseTitle: "Caso A", clientName: "Ana", pendingBalance: 300 },
      { caseId: "2", caseTitle: "Caso B", clientName: "Bruno", pendingBalance: 900 },
    ]);

    expect(result).toEqual([
      { caseId: "2", caseTitle: "Caso B", clientName: "Bruno", pendingBalance: 900 },
      { caseId: "1", caseTitle: "Caso A", clientName: "Ana", pendingBalance: 800 },
    ]);
  });
});
