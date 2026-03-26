import { describe, expect, it } from "vitest";
import {
  buildCalendarMonth,
  describeActivityLogEntry,
  sortRemindersForPanel,
  summarizeActivityMetrics,
  summarizeReminderPanel,
} from "./operations-insights";

describe("summarizeReminderPanel", () => {
  it("counts pending, completed, overdue and upcoming reminders", () => {
    const summary = summarizeReminderPanel(
      [
        { completed: false, priority: "HIGH", reminderDate: "2026-03-16T09:00:00.000Z" },
        { completed: false, priority: "MEDIUM", reminderDate: "2026-03-17T14:00:00.000Z" },
        { completed: false, priority: "LOW", reminderDate: "2026-03-20T10:00:00.000Z" },
        { completed: true, priority: "LOW", reminderDate: "2026-03-15T10:00:00.000Z" },
      ],
      new Date("2026-03-17T12:00:00.000Z")
    );

    expect(summary).toEqual({
      pending: 3,
      completed: 1,
      highPriority: 1,
      overdue: 1,
      dueToday: 1,
      upcoming: 1,
    });
  });
});

describe("sortRemindersForPanel", () => {
  it("prioritizes overdue reminders, then date, then priority", () => {
    const sorted = sortRemindersForPanel(
      [
        { id: "future", completed: false, priority: "HIGH", reminderDate: "2026-03-21T10:00:00.000Z" },
        { id: "today-low", completed: false, priority: "LOW", reminderDate: "2026-03-17T15:00:00.000Z" },
        { id: "overdue", completed: false, priority: "LOW", reminderDate: "2026-03-16T08:00:00.000Z" },
        { id: "today-high", completed: false, priority: "HIGH", reminderDate: "2026-03-17T09:00:00.000Z" },
      ],
      new Date("2026-03-17T12:00:00.000Z")
    );

    expect(sorted.map((item) => item.id)).toEqual(["overdue", "today-high", "today-low", "future"]);
  });
});

describe("buildCalendarMonth", () => {
  it("creates a month grid with current-month days and event placement", () => {
    const weeks = buildCalendarMonth(new Date("2026-03-17T12:00:00.000Z"), [
      { id: "a", date: "2026-03-03", type: "charge", title: "Cobro" },
      { id: "b", date: "2026-03-17", type: "reminder", title: "Llamar" },
    ]);

    expect(weeks.length).toBeGreaterThanOrEqual(5);
    const firstWeek = weeks[0];
    expect(firstWeek[0].isCurrentMonth).toBe(false);

    const marchThird = weeks.flat().find((day) => day.dateKey === "2026-03-03");
    const marchSeventeenth = weeks.flat().find((day) => day.dateKey === "2026-03-17");

    expect(marchThird?.events).toHaveLength(1);
    expect(marchSeventeenth?.events[0]?.title).toBe("Llamar");
    expect(marchSeventeenth?.isCurrentMonth).toBe(true);
  });

  it("keeps multiple events grouped on the same day", () => {
    const weeks = buildCalendarMonth(new Date("2026-03-17T12:00:00.000Z"), [
      { id: "a", date: "2026-03-17", type: "charge", title: "Cobro" },
      { id: "b", date: "2026-03-17", type: "reminder", title: "Llamar" },
    ]);

    const day = weeks.flat().find((item) => item.dateKey === "2026-03-17");

    expect(day?.events.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("describeActivityLogEntry", () => {
  it("prefers explicit note when available", () => {
    expect(
      describeActivityLogEntry({
        entityType: "charge",
        action: "updated",
        note: "Cobro cancelado",
        previousValue: null,
        newValue: null,
      })
    ).toBe("Cobro cancelado");
  });

  it("builds a readable summary from changed fields when there is no note", () => {
    expect(
      describeActivityLogEntry({
        entityType: "reminder",
        action: "updated",
        previousValue: { completed: false, priority: "LOW" },
        newValue: { completed: true, priority: "HIGH" },
      })
    ).toBe("Recordatorio modificado: completed, priority");
  });

  it("falls back to the generic entity and action label when there are no changed keys", () => {
    expect(
      describeActivityLogEntry({
        entityType: "payment",
        action: "deleted",
        previousValue: null,
        newValue: null,
      })
    ).toBe("Pago eliminado");
  });
});

describe("summarizeActivityMetrics", () => {
  it("counts actions and entity distribution", () => {
    const summary = summarizeActivityMetrics([
      { action: "created", entityType: "case" },
      { action: "updated", entityType: "charge" },
      { action: "updated", entityType: "charge" },
      { action: "deleted", entityType: "expense" },
    ]);

    expect(summary.actions).toEqual({
      created: 1,
      updated: 2,
      deleted: 1,
      status_changed: 0,
      due_date_changed: 0,
    });
    expect(summary.entities.charge).toBe(2);
  });

  it("tracks status and due date changes separately", () => {
    const summary = summarizeActivityMetrics([
      { action: "status_changed", entityType: "reminder" },
      { action: "due_date_changed", entityType: "charge" },
    ]);

    expect(summary.actions.status_changed).toBe(1);
    expect(summary.actions.due_date_changed).toBe(1);
  });
});
