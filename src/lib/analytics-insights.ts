type DerivedStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

interface ExpenseCategoryInput {
  category?: string | null;
  amount: number;
}

interface ClientBalanceInput {
  clientId: string;
  clientName: string;
  collected: number;
  balance: number;
}

interface PendingCaseInput {
  caseId: string;
  caseTitle: string;
  clientName: string;
  pendingBalance: number;
}

export function pickUpcomingCharges<T extends { dueDate: string | null; derivedStatus: string }>(items: T[]) {
  return items
    .filter((item) => item.derivedStatus !== "PAID" && item.derivedStatus !== "CANCELLED" && Boolean(item.dueDate))
    .sort((left, right) => new Date(left.dueDate!).getTime() - new Date(right.dueDate!).getTime());
}

export function pickUrgentReminders<
  T extends { reminderDate: string | Date; completed: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }
>(items: T[]) {
  const priorityWeight = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return items
    .filter((item) => !item.completed)
    .sort((left, right) => {
      const leftDate = new Date(left.reminderDate).getTime();
      const rightDate = new Date(right.reminderDate).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return priorityWeight[left.priority] - priorityWeight[right.priority];
    });
}

export function buildTopClients(items: Array<{ clientId: string; clientName: string; collected: number; balance: number }>) {
  const grouped = new Map<string, { clientId: string; clientName: string; collected: number; balance: number }>();

  for (const item of items) {
    const existing = grouped.get(item.clientId);
    if (existing) {
      existing.collected += item.collected;
      existing.balance += item.balance;
    } else {
      grouped.set(item.clientId, { ...item });
    }
  }

  return [...grouped.values()].sort((left, right) => right.collected - left.collected);
}

export function buildTopDebtClients(items: ClientBalanceInput[]) {
  return buildTopClients(items)
    .filter((item) => item.balance > 0)
    .sort((left, right) => right.balance - left.balance);
}

export function buildTopPendingCases(items: PendingCaseInput[]) {
  const grouped = new Map<string, PendingCaseInput>();

  for (const item of items) {
    const existing = grouped.get(item.caseId);
    if (existing) {
      existing.pendingBalance += item.pendingBalance;
    } else {
      grouped.set(item.caseId, { ...item });
    }
  }

  return [...grouped.values()].sort((left, right) => right.pendingBalance - left.pendingBalance);
}

export function buildExpensesByCategory(items: ExpenseCategoryInput[], limit = 6) {
  const grouped = new Map<string, number>();

  for (const item of items) {
    const key = item.category?.trim() || "Varios";
    grouped.set(key, (grouped.get(key) ?? 0) + item.amount);
  }

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  const sorted = [...grouped.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((left, right) => right.value - left.value);

  if (sorted.length <= limit) return sorted;

  const visible = sorted.slice(0, limit);
  const remainderValue = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);

  return [
    ...visible,
    {
      name: "Otras",
      value: remainderValue,
      percentage: total > 0 ? Math.round((remainderValue / total) * 100) : 0,
    },
  ];
}

export function buildChargeStatusBreakdown(items: string[]) {
  const result: Record<DerivedStatus, number> = {
    PENDING: 0,
    PARTIAL: 0,
    PAID: 0,
    OVERDUE: 0,
    CANCELLED: 0,
  };

  for (const item of items) {
    if (item in result) {
      result[item as DerivedStatus] += 1;
    }
  }

  return result;
}

export function buildMonthlyNetSeries(
  incomeRows: Array<{ month: string; total: number }>,
  expenseRows: Array<{ month: string; total: number }>
) {
  const byMonth = new Map<string, { month: string; income: number; expenses: number; net: number }>();

  for (const row of incomeRows) {
    byMonth.set(row.month, { month: row.month, income: row.total, expenses: 0, net: row.total });
  }

  for (const row of expenseRows) {
    const existing = byMonth.get(row.month);
    if (existing) {
      existing.expenses = row.total;
      existing.net = existing.income - row.total;
    } else {
      byMonth.set(row.month, { month: row.month, income: 0, expenses: row.total, net: -row.total });
    }
  }

  return [...byMonth.values()].sort((left, right) => left.month.localeCompare(right.month));
}
