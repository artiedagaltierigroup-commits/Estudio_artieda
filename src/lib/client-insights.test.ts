import { describe, expect, it } from "vitest";
import { filterClientsByQuery, getClientPortfolioStatus, summarizeClientFinance } from "./client-insights";

describe("filterClientsByQuery", () => {
  const clients = [
    { name: "Ana Perez", email: "ana@estudio.com", phone: "1111", taxId: "20-1" },
    { name: "Bruno Diaz", email: "", phone: "2222", taxId: "30-2" },
    { name: "Carla Gomez", email: "carla@correo.com", phone: "", taxId: "" },
  ];

  it("returns all clients when query is empty", () => {
    expect(filterClientsByQuery(clients, "")).toHaveLength(3);
  });

  it("matches by name, email, phone and tax id", () => {
    expect(filterClientsByQuery(clients, "ana")).toHaveLength(1);
    expect(filterClientsByQuery(clients, "2222")).toHaveLength(1);
    expect(filterClientsByQuery(clients, "30-2")).toHaveLength(1);
    expect(filterClientsByQuery(clients, "correo")).toHaveLength(1);
  });
});

describe("summarizeClientFinance", () => {
  it("aggregates expected, collected, balance, overdue, upcoming, reminders and last movement", () => {
    const summary = summarizeClientFinance({
      clientUpdatedAt: "2026-03-10T10:00:00.000Z",
      cases: [
        {
          updatedAt: "2026-03-12T10:00:00.000Z",
          charges: [
            {
              amountTotal: "100000",
              dueDate: "2099-03-20",
              cancelledAt: null,
              updatedAt: "2026-03-13T10:00:00.000Z",
              payments: [{ amount: "30000", createdAt: "2026-03-14T10:00:00.000Z" }],
            },
            {
              amountTotal: "50000",
              dueDate: "2000-03-10",
              cancelledAt: null,
              updatedAt: "2026-03-11T10:00:00.000Z",
              payments: [],
            },
            {
              amountTotal: "25000",
              dueDate: "2099-05-01",
              cancelledAt: "2026-03-15T10:00:00.000Z",
              updatedAt: "2026-03-15T10:00:00.000Z",
              payments: [],
            },
            {
              amountTotal: "40000",
              dueDate: "2099-04-01",
              cancelledAt: null,
              updatedAt: "2026-03-09T10:00:00.000Z",
              payments: [{ amount: "40000", createdAt: "2026-03-09T10:00:00.000Z" }],
            },
          ],
        },
      ],
      reminders: [
        { completed: false, reminderDate: "2099-03-18T09:00:00.000Z", updatedAt: "2026-03-15T09:00:00.000Z" },
        { completed: true, reminderDate: "2099-03-19T09:00:00.000Z", updatedAt: "2026-03-16T09:00:00.000Z" },
      ],
    });

    expect(summary.expected).toBe(190000);
    expect(summary.collected).toBe(70000);
    expect(summary.balance).toBe(120000);
    expect(summary.overdue).toBe(1);
    expect(summary.partial).toBe(1);
    expect(summary.paid).toBe(1);
    expect(summary.pending).toBe(0);
    expect(summary.cancelled).toBe(1);
    expect(summary.upcomingCharges).toBe(1);
    expect(summary.openReminders).toBe(1);
    expect(summary.lastMovementAt).toBe("2026-03-16T09:00:00.000Z");
  });

  it("returns a stable empty summary when the client has no cases or reminders", () => {
    expect(
      summarizeClientFinance({
        clientUpdatedAt: null,
        cases: [],
        reminders: [],
      })
    ).toMatchObject({
      expected: 0,
      collected: 0,
      balance: 0,
      overdue: 0,
      partial: 0,
      paid: 0,
      pending: 0,
      cancelled: 0,
      upcomingCharges: 0,
      openReminders: 0,
      lastMovementAt: null,
    });
  });
});

describe("getClientPortfolioStatus", () => {
  it("prioritizes overdue debt, then active work, then follow-up", () => {
    expect(getClientPortfolioStatus({ activeCases: 1, overdueCharges: 2, openReminders: 1 })).toBe("OVERDUE");
    expect(getClientPortfolioStatus({ activeCases: 1, overdueCharges: 0, openReminders: 1 })).toBe("ACTIVE");
    expect(getClientPortfolioStatus({ activeCases: 0, overdueCharges: 0, openReminders: 1 })).toBe("FOLLOW_UP");
    expect(getClientPortfolioStatus({ activeCases: 0, overdueCharges: 0, openReminders: 0 })).toBe("IDLE");
  });
});
