import { describe, expect, it } from "vitest";
import {
  buildSavingsGoalView,
  filterSavingsGoalsByStatus,
  summarizeSavingsGoals,
} from "./savings-insights";

describe("buildSavingsGoalView", () => {
  it("calculates progress, remaining amount and completed status", () => {
    const view = buildSavingsGoalView({
      id: "goal-1",
      name: "Reserva tributaria",
      description: null,
      targetAmount: "100000",
      deadline: "2026-08-01",
      status: "IN_PROGRESS",
      contributions: [{ amount: "35000" }, { amount: "65000" }],
    });

    expect(view.savedAmount).toBe(100000);
    expect(view.remainingAmount).toBe(0);
    expect(view.progressPercentage).toBe(100);
    expect(view.derivedStatus).toBe("COMPLETED");
  });

  it("caps progress at 100 and keeps paused goals paused", () => {
    const view = buildSavingsGoalView({
      id: "goal-2",
      name: "Equipo",
      description: null,
      targetAmount: "50000",
      deadline: null,
      status: "PAUSED",
      contributions: [{ amount: "80000" }],
    });

    expect(view.progressPercentage).toBe(100);
    expect(view.remainingAmount).toBe(0);
    expect(view.derivedStatus).toBe("PAUSED");
  });

  it("ignores voided contributions when calculating progress", () => {
    const view = buildSavingsGoalView({
      id: "goal-3",
      name: "Reserva",
      description: null,
      targetAmount: "100000",
      deadline: null,
      status: "IN_PROGRESS",
      contributions: [
        { amount: "30000" },
        { amount: "70000", voidedAt: new Date("2026-05-01T12:00:00.000Z") },
      ],
    });

    expect(view.savedAmount).toBe(30000);
    expect(view.remainingAmount).toBe(70000);
    expect(view.derivedStatus).toBe("IN_PROGRESS");
  });
});

describe("filterSavingsGoalsByStatus", () => {
  const goals = [
    {
      id: "goal-1",
      name: "Reserva",
      description: null,
      targetAmount: "100",
      deadline: null,
      status: "IN_PROGRESS" as const,
      contributions: [{ amount: "25" }],
    },
    {
      id: "goal-2",
      name: "Completo",
      description: null,
      targetAmount: "100",
      deadline: null,
      status: "IN_PROGRESS" as const,
      contributions: [{ amount: "100" }],
    },
    {
      id: "goal-3",
      name: "Pausado",
      description: null,
      targetAmount: "100",
      deadline: null,
      status: "PAUSED" as const,
      contributions: [{ amount: "50" }],
    },
  ];

  it("shows in-progress goals by default", () => {
    expect(filterSavingsGoalsByStatus(goals, "IN_PROGRESS").map((goal) => goal.id)).toEqual(["goal-1"]);
  });

  it("supports completed, paused and all filters", () => {
    expect(filterSavingsGoalsByStatus(goals, "COMPLETED").map((goal) => goal.id)).toEqual(["goal-2"]);
    expect(filterSavingsGoalsByStatus(goals, "PAUSED").map((goal) => goal.id)).toEqual(["goal-3"]);
    expect(filterSavingsGoalsByStatus(goals, "ALL")).toHaveLength(3);
  });
});

describe("summarizeSavingsGoals", () => {
  it("aggregates visible savings metrics", () => {
    const summary = summarizeSavingsGoals([
      {
        id: "goal-1",
        name: "Reserva",
        description: null,
        targetAmount: "100",
        deadline: null,
        status: "IN_PROGRESS",
        contributions: [{ amount: "25" }],
      },
      {
        id: "goal-2",
        name: "Completo",
        description: null,
        targetAmount: "200",
        deadline: null,
        status: "IN_PROGRESS",
        contributions: [{ amount: "200" }],
      },
    ]);

    expect(summary.totalSaved).toBe(225);
    expect(summary.totalTarget).toBe(300);
    expect(summary.totalRemaining).toBe(75);
    expect(summary.inProgressCount).toBe(1);
    expect(summary.completedCount).toBe(1);
  });
});
