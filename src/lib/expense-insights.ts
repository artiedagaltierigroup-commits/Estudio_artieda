interface ExpenseInput {
  amount: string | number;
  type: string;
}

interface RecurringExpenseInput {
  amount: string | number;
  active: boolean;
}

interface FilterableExpense {
  description: string;
  type: string;
  category?: string | null;
}

interface ExpenseFilters {
  query?: string;
  type?: string;
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function summarizeExpenseMetrics(input: {
  expenses: ExpenseInput[];
  recurring: RecurringExpenseInput[];
}) {
  return {
    totalExpenses: input.expenses.reduce((sum, item) => sum + Number(item.amount), 0),
    totalRecurringActive: input.recurring.filter((item) => item.active).reduce((sum, item) => sum + Number(item.amount), 0),
    operativeCount: input.expenses.filter((item) => item.type === "OPERATIVE").length,
    taxCount: input.expenses.filter((item) => item.type === "TAX").length,
    activeRecurringCount: input.recurring.filter((item) => item.active).length,
  };
}

export function buildExpenseMonthBoard(input: {
  expectedIncome: number;
  collectedIncome: number;
  periodExpenses: number;
}) {
  const realAvailable = input.collectedIncome - input.periodExpenses;
  const projectedAvailable = input.expectedIncome - input.periodExpenses;
  const pendingToCollect = Math.max(0, input.expectedIncome - input.collectedIncome);

  return {
    realAvailable,
    projectedAvailable,
    pendingToCollect,
    spentShareOfCollected:
      input.collectedIncome > 0 ? Math.min(100, (input.periodExpenses / input.collectedIncome) * 100) : 0,
  };
}

export function filterExpensesByFilters<T extends FilterableExpense>(items: T[], filters: ExpenseFilters) {
  const query = normalize(filters.query);

  return items.filter((item) => {
    const matchesQuery =
      !query ||
      normalize(item.description).includes(query) ||
      normalize(item.category ?? "").includes(query);
    const matchesType = !filters.type || item.type === filters.type;

    return matchesQuery && matchesType;
  });
}
