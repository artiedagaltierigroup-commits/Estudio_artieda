import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { getBusinessDate } from "./business-date";

import { getReminderWindowStart, type RecurringExpenseOccurrenceStatus } from "./recurring-expense-occurrences";

const PRIORITY_WEIGHT = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
} as const;

type RecurringPayablePriority = keyof typeof PRIORITY_WEIGHT;

export interface RecurringPayableChecklistRow {
  dueDate: string;
  status: RecurringExpenseOccurrenceStatus;
  priority: RecurringPayablePriority;
  notifyDaysBefore: number;
}

export function getRecurringPayableChecklistRange(referenceDate: Date) {
  const calendarDate = parseISO(getBusinessDate(referenceDate));
  return {
    from: format(startOfMonth(calendarDate), "yyyy-MM-dd"),
    to: format(endOfMonth(calendarDate), "yyyy-MM-dd"),
  };
}

export function isRecurringPayableAlertVisible(
  row: Pick<RecurringPayableChecklistRow, "dueDate" | "notifyDaysBefore" | "status">,
  todayKey: string
) {
  if (row.status === "PAID" || row.status === "CANCELLED") return false;
  return getReminderWindowStart(row.dueDate, row.notifyDaysBefore) <= todayKey;
}

export function buildRecurringPayableChecklist<T extends RecurringPayableChecklistRow>(rows: T[]) {
  const pending = rows
    .filter((row) => row.status === "PENDING" || row.status === "OVERDUE")
    .sort((left, right) => {
      const leftOverdue = left.status === "OVERDUE";
      const rightOverdue = right.status === "OVERDUE";
      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
      const dateDelta = left.dueDate.localeCompare(right.dueDate);
      if (dateDelta !== 0) return dateDelta;
      return PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
    });

  const paid = rows
    .filter((row) => row.status === "PAID")
    .sort((left, right) => right.dueDate.localeCompare(left.dueDate));

  return {
    pending: pending.map((item) => ({ ...item, status: item.status as "PENDING" | "OVERDUE" })),
    paid: paid.map((item) => ({ ...item, status: "PAID" as const })),
    cancelled: rows.filter((row) => row.status === "CANCELLED").map((item) => ({ ...item, status: "CANCELLED" as const })),
    summary: {
      pending: pending.length,
      overdue: pending.filter((item) => item.status === "OVERDUE").length,
      paid: paid.length,
    },
  };
}
