import { listRecurringDueDates } from "./recurring-expense-occurrences";

export interface RecurringProjectionInput {
  amount: string | number;
  active: boolean;
  frequency: "monthly" | "quarterly" | "semiannual" | "yearly";
  startDate: string;
  endDate: string | null;
}

export function calculateMonthlyProjection(items: RecurringProjectionInput[], targetMonth: Date): number {
  const from = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return items.reduce((total, recurring) => total + Number(recurring.amount) * listRecurringDueDates({ ...recurring, mode: "AUTOMATIC", payableDayOfMonth: null }, { from, to }).length, 0);
}
