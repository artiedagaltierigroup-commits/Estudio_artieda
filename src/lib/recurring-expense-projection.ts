import {
  addMonths,
  addQuarters,
  addYears,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

export interface RecurringProjectionInput {
  amount: string | number;
  active: boolean;
  frequency: "monthly" | "quarterly" | "semiannual" | "yearly";
  startDate: string;
  endDate: string | null;
}

export function calculateMonthlyProjection(items: RecurringProjectionInput[], targetMonth: Date): number {
  const monthStart = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  let total = 0;

  for (const recurring of items) {
    if (!recurring.active) continue;

    const start = parseISO(recurring.startDate);
    const end = recurring.endDate ? parseISO(recurring.endDate) : null;

    if (isAfter(start, monthEnd)) continue;
    if (end && isBefore(end, monthStart)) continue;

    let cursor = start;
    let hits = false;

    while (!isAfter(cursor, monthEnd)) {
      if (!isBefore(cursor, monthStart) && !isAfter(cursor, monthEnd)) {
        hits = true;
        break;
      }

      switch (recurring.frequency) {
        case "monthly":
          cursor = addMonths(cursor, 1);
          break;
        case "quarterly":
          cursor = addQuarters(cursor, 1);
          break;
        case "semiannual":
          cursor = addMonths(cursor, 6);
          break;
        case "yearly":
          cursor = addYears(cursor, 1);
          break;
      }
    }

    if (hits) total += parseFloat(String(recurring.amount));
  }

  return total;
}
