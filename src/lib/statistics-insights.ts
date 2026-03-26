import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface PeriodRange {
  from: string;
  to: string;
}

interface TopCaseInput {
  caseId: string;
  caseTitle: string;
  clientName: string;
  collected: number;
}

interface TrendPaymentInput {
  paymentDate: string;
  amount: number;
}

interface TrendExpenseInput {
  date: string;
  amount: number;
}

function formatTrendLabel(date: Date, pattern: string) {
  return format(date, pattern, { locale: es }).replace(/\./g, "");
}

export function getPreviousEquivalentRange({ from, to }: PeriodRange): PeriodRange {
  const startDate = parseISO(from);
  const endDate = parseISO(to);
  const rangeLength = differenceInCalendarDays(endDate, startDate) + 1;
  const previousEnd = subDays(startDate, 1);
  const previousStart = subDays(previousEnd, rangeLength - 1);

  return {
    from: format(previousStart, "yyyy-MM-dd"),
    to: format(previousEnd, "yyyy-MM-dd"),
  };
}

export function getComparisonDelta(current: number, previous: number) {
  const amount = current - previous;
  const direction = amount === 0 ? "flat" : amount > 0 ? "up" : "down";

  if (previous === 0) {
    return {
      amount,
      percentage: current === 0 ? 0 : 100,
      direction,
    } as const;
  }

  return {
    amount,
    percentage: Math.round((amount / previous) * 100),
    direction,
  } as const;
}

export function buildTopCasesByCollected(items: TopCaseInput[]) {
  const grouped = new Map<string, TopCaseInput>();

  for (const item of items) {
    const existing = grouped.get(item.caseId);
    if (existing) {
      existing.collected += item.collected;
    } else {
      grouped.set(item.caseId, { ...item });
    }
  }

  return [...grouped.values()].sort((left, right) => right.collected - left.collected);
}

export function buildStatisticsTrendSeries({
  from,
  to,
  payments,
  expenses,
}: {
  from: string;
  to: string;
  payments: TrendPaymentInput[];
  expenses: TrendExpenseInput[];
}) {
  const totalDays = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;

  if (totalDays <= 31) {
    const rows: Array<{ label: string; grossIncome: number; expenses: number }> = [];
    let cursor = parseISO(from);
    const end = parseISO(to);

    while (cursor <= end) {
      const dateKey = format(cursor, "yyyy-MM-dd");
      rows.push({
        label: formatTrendLabel(cursor, "d MMM"),
        grossIncome: payments
          .filter((payment) => payment.paymentDate === dateKey)
          .reduce((sum, payment) => sum + payment.amount, 0),
        expenses: expenses
          .filter((expense) => expense.date === dateKey)
          .reduce((sum, expense) => sum + expense.amount, 0),
      });

      cursor = addDays(cursor, 1);
    }

    return rows;
  }

  const rows: Array<{ label: string; grossIncome: number; expenses: number }> = [];
  let cursor = startOfMonth(parseISO(from));
  const end = startOfMonth(parseISO(to));

  while (cursor <= end) {
    const monthKey = format(cursor, "yyyy-MM");
    rows.push({
      label: formatTrendLabel(cursor, "MMM yy"),
      grossIncome: payments
        .filter((payment) => payment.paymentDate.startsWith(monthKey))
        .reduce((sum, payment) => sum + payment.amount, 0),
      expenses: expenses
        .filter((expense) => expense.date.startsWith(monthKey))
        .reduce((sum, expense) => sum + expense.amount, 0),
    });

    cursor = addMonths(cursor, 1);
  }

  return rows;
}
