import {
  addDays,
  addMonths,
  addQuarters,
  addYears,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  setDate,
  startOfDay,
} from "date-fns";

export type RecurringExpenseMode = "AUTOMATIC" | "PAYABLE";
export type RecurringExpenseOccurrenceStatus = "PENDING" | "PAID" | "OVERDUE" | "GENERATED";
export type RecurringExpenseFrequency = "monthly" | "quarterly" | "semiannual" | "yearly";

export interface RecurringOccurrenceDateInput {
  active: boolean;
  mode: RecurringExpenseMode;
  frequency: RecurringExpenseFrequency;
  startDate: string;
  endDate: string | null;
  payableDayOfMonth: number | null;
}

function clampToMonthDay(date: Date, desiredDay: number): Date {
  const lastDay = endOfMonth(date).getDate();
  return setDate(date, Math.min(desiredDay, lastDay));
}

function addByFrequency(date: Date, frequency: RecurringExpenseFrequency): Date {
  switch (frequency) {
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addQuarters(date, 1);
    case "semiannual":
      return addMonths(date, 6);
    case "yearly":
      return addYears(date, 1);
  }
}

function normalizePayableStartDate(startDate: Date, payableDayOfMonth: number, frequency: RecurringExpenseFrequency): Date {
  let dueDate = clampToMonthDay(startDate, payableDayOfMonth);

  if (isBefore(dueDate, startOfDay(startDate))) {
    dueDate = clampToMonthDay(addByFrequency(startDate, frequency), payableDayOfMonth);
  }

  return dueDate;
}

export function listRecurringDueDates(input: RecurringOccurrenceDateInput, range: { from: string; to: string }): string[] {
  if (!input.active) return [];

  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const endDate = input.endDate ? parseISO(input.endDate) : null;
  let cursor =
    input.mode === "PAYABLE"
      ? normalizePayableStartDate(parseISO(input.startDate), input.payableDayOfMonth ?? 1, input.frequency)
      : parseISO(input.startDate);

  const result: string[] = [];

  while (!isAfter(cursor, to)) {
    if (!isBefore(cursor, from) && (endDate === null || !isAfter(cursor, endDate))) {
      result.push(format(cursor, "yyyy-MM-dd"));
    }

    cursor =
      input.mode === "PAYABLE"
        ? clampToMonthDay(addByFrequency(cursor, input.frequency), input.payableDayOfMonth ?? 1)
        : addByFrequency(cursor, input.frequency);
  }

  return result;
}

export function getRecurringOccurrenceStatus(input: {
  mode: RecurringExpenseMode;
  dueDate: string;
  today: string;
}): RecurringExpenseOccurrenceStatus {
  const dueDate = parseISO(input.dueDate);
  const today = parseISO(input.today);

  if (input.mode === "AUTOMATIC" && !isAfter(dueDate, today)) {
    return "GENERATED";
  }

  if (isBefore(dueDate, today)) {
    return "OVERDUE";
  }

  return "PENDING";
}

export function getReminderWindowStart(dueDate: string, notifyDaysBefore: number): string {
  return format(addDays(parseISO(dueDate), -notifyDaysBefore), "yyyy-MM-dd");
}
