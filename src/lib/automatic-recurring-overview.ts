import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfDay } from "date-fns";

import type { recurringExpenses } from "@/db/schema";
import { listRecurringDueDates } from "./recurring-expense-occurrences";

type RecurringExpenseRow = typeof recurringExpenses.$inferSelect;

export interface AutomaticRecurringOverviewItem {
  id: string;
  description: string;
  amount: string;
  type: RecurringExpenseRow["type"];
  category: string | null;
  frequency: RecurringExpenseRow["frequency"];
  nextDueDate: string | null;
  followingDueDate: string | null;
  dueThisMonth: boolean;
  daysUntilNextDue: number | null;
}

export function buildAutomaticRecurringOverview(
  recurringRows: RecurringExpenseRow[],
  referenceDate = new Date()
): AutomaticRecurringOverviewItem[] {
  const from = format(referenceDate, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(referenceDate), "yyyy-MM-dd");
  const horizon = format(addDays(referenceDate, 380), "yyyy-MM-dd");

  return recurringRows
    .filter((item) => item.active && item.mode === "AUTOMATIC")
    .map((item) => {
      const dueDateInput = {
        active: item.active,
        mode: item.mode,
        frequency: item.frequency,
        startDate: item.startDate,
        endDate: item.endDate,
        payableDayOfMonth: item.payableDayOfMonth,
      };
      const upcomingDates = listRecurringDueDates(dueDateInput, { from, to: horizon });
      const currentMonthDates = listRecurringDueDates(dueDateInput, { from, to: monthEnd });
      const nextDueDate = upcomingDates[0] ?? null;

      return {
        id: item.id,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: item.category,
        frequency: item.frequency,
        nextDueDate,
        followingDueDate: upcomingDates[1] ?? null,
        dueThisMonth: currentMonthDates.length > 0,
        daysUntilNextDue: nextDueDate
          ? differenceInCalendarDays(parseISO(nextDueDate), startOfDay(referenceDate))
          : null,
      };
    })
    .sort((left, right) => {
      if (left.nextDueDate === null && right.nextDueDate === null) {
        return left.description.localeCompare(right.description);
      }

      if (left.nextDueDate === null) return 1;
      if (right.nextDueDate === null) return -1;

      const dateDelta = left.nextDueDate.localeCompare(right.nextDueDate);
      if (dateDelta !== 0) return dateDelta;

      return left.description.localeCompare(right.description);
    });
}
