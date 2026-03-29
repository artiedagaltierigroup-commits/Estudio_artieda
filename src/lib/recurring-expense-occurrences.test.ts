import { describe, expect, it } from "vitest";
import {
  getReminderWindowStart,
  getRecurringOccurrenceStatus,
  listRecurringDueDates,
} from "./recurring-expense-occurrences";

describe("listRecurringDueDates", () => {
  it("lists automatic monthly due dates inside the requested window", () => {
    expect(
      listRecurringDueDates(
        {
          active: true,
          mode: "AUTOMATIC",
          frequency: "monthly",
          startDate: "2026-01-10",
          endDate: null,
          payableDayOfMonth: null,
        },
        { from: "2026-03-01", to: "2026-03-31" }
      )
    ).toEqual(["2026-03-10"]);
  });

  it("supports semiannual schedules", () => {
    expect(
      listRecurringDueDates(
        {
          active: true,
          mode: "AUTOMATIC",
          frequency: "semiannual",
          startDate: "2026-01-15",
          endDate: null,
          payableDayOfMonth: null,
        },
        { from: "2026-07-01", to: "2026-07-31" }
      )
    ).toEqual(["2026-07-15"]);
  });

  it("pushes the first payable due date to the next period when the day already passed in the creation month", () => {
    expect(
      listRecurringDueDates(
        {
          active: true,
          mode: "PAYABLE",
          frequency: "monthly",
          startDate: "2026-03-29",
          endDate: null,
          payableDayOfMonth: 5,
        },
        { from: "2026-03-01", to: "2026-04-30" }
      )
    ).toEqual(["2026-04-05"]);
  });

  it("keeps payable quarterly due dates anchored to the chosen payment day", () => {
    expect(
      listRecurringDueDates(
        {
          active: true,
          mode: "PAYABLE",
          frequency: "quarterly",
          startDate: "2026-03-02",
          endDate: null,
          payableDayOfMonth: 5,
        },
        { from: "2026-03-01", to: "2026-09-30" }
      )
    ).toEqual(["2026-03-05", "2026-06-05", "2026-09-05"]);
  });
});

describe("getRecurringOccurrenceStatus", () => {
  it("marks payable occurrences as overdue after the due date", () => {
    expect(getRecurringOccurrenceStatus({ mode: "PAYABLE", dueDate: "2026-03-10", today: "2026-03-11" })).toBe("OVERDUE");
  });

  it("marks automatic occurrences as generated when the date arrives", () => {
    expect(getRecurringOccurrenceStatus({ mode: "AUTOMATIC", dueDate: "2026-03-10", today: "2026-03-10" })).toBe("GENERATED");
  });
});

describe("getReminderWindowStart", () => {
  it("subtracts the configured number of days", () => {
    expect(getReminderWindowStart("2026-03-20", 7)).toBe("2026-03-13");
  });

  it("returns the same date when reminders start on the due day", () => {
    expect(getReminderWindowStart("2026-03-20", 0)).toBe("2026-03-20");
  });
});
