export type SavingsGoalStatus = "IN_PROGRESS" | "PAUSED";
export type SavingsGoalFilter = "IN_PROGRESS" | "COMPLETED" | "PAUSED" | "ALL";
export type SavingsGoalDerivedStatus = SavingsGoalFilter extends infer T ? Extract<T, "IN_PROGRESS" | "COMPLETED" | "PAUSED"> : never;

export interface SavingsContributionInput {
  amount: string | number;
  voidedAt?: string | Date | null;
}

export interface SavingsGoalInput {
  id: string;
  name: string;
  description?: string | null;
  targetAmount: string | number;
  deadline?: string | null;
  status: SavingsGoalStatus;
  contributions: SavingsContributionInput[];
}

export interface SavingsGoalView extends SavingsGoalInput {
  savedAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  derivedStatus: "IN_PROGRESS" | "COMPLETED" | "PAUSED";
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildSavingsGoalView(goal: SavingsGoalInput): SavingsGoalView {
  const targetAmount = Math.max(0, toNumber(goal.targetAmount));
  const savedAmount = goal.contributions
    .filter((contribution) => !contribution.voidedAt)
    .reduce((sum, contribution) => sum + toNumber(contribution.amount), 0);
  const remainingAmount = Math.max(0, targetAmount - savedAmount);
  const progressPercentage = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;
  const derivedStatus = goal.status === "PAUSED" ? "PAUSED" : remainingAmount === 0 ? "COMPLETED" : "IN_PROGRESS";

  return {
    ...goal,
    savedAmount,
    remainingAmount,
    progressPercentage,
    derivedStatus,
  };
}

export function filterSavingsGoalsByStatus<T extends SavingsGoalInput>(
  goals: T[],
  filter: SavingsGoalFilter = "IN_PROGRESS"
) {
  const views = goals.map((goal) => buildSavingsGoalView(goal));

  if (filter === "ALL") return views;

  return views.filter((goal) => goal.derivedStatus === filter);
}

export function summarizeSavingsGoals(goals: SavingsGoalInput[]) {
  const views = goals.map((goal) => buildSavingsGoalView(goal));

  return {
    totalSaved: views.reduce((sum, goal) => sum + goal.savedAmount, 0),
    totalTarget: views.reduce((sum, goal) => sum + toNumber(goal.targetAmount), 0),
    totalRemaining: views.reduce((sum, goal) => sum + goal.remainingAmount, 0),
    inProgressCount: views.filter((goal) => goal.derivedStatus === "IN_PROGRESS").length,
    completedCount: views.filter((goal) => goal.derivedStatus === "COMPLETED").length,
    pausedCount: views.filter((goal) => goal.derivedStatus === "PAUSED").length,
  };
}
