"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { expenses, savingsContributions, savingsGoals } from "@/db/schema";
import { buildSavingsGoalView } from "@/lib/savings-insights";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

const SavingsGoalSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  targetAmount: z.string().min(1, "La meta es obligatoria").refine((value) => Number(value) > 0, {
    message: "La meta debe ser mayor a cero",
  }),
  deadline: z.string().optional(),
});

const SavingsContributionSchema = z.object({
  savingsGoalId: z.string().uuid("Ahorro invalido"),
  amount: z.string().min(1, "El monto es obligatorio").refine((value) => Number(value) > 0, {
    message: "El monto debe ser mayor a cero",
  }),
  contributionDate: z.string().min(1, "La fecha es obligatoria"),
  description: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

function revalidateSavingsSurfaces(goalId?: string) {
  revalidatePath("/");
  revalidatePath("/ahorros");
  revalidatePath("/gastos");
  revalidatePath("/estadisticas");
  if (goalId) revalidatePath("/ahorros");
}

function buildContributionExpenseNotes(goalName: string, description: string | null) {
  const parts = [`Generado desde ahorro: ${goalName}.`];
  if (description) parts.push(description);
  return parts.join(" ");
}

export async function getSavingsGoals() {
  const userId = await getUserId();

  return db.query.savingsGoals.findMany({
    where: (goal, { eq: eqOperator }) => eqOperator(goal.userId, userId),
    with: {
      contributions: {
        orderBy: (contribution, { desc }) => [desc(contribution.contributionDate), desc(contribution.createdAt)],
      },
    },
    orderBy: (goal, { desc }) => [desc(goal.updatedAt), desc(goal.createdAt)],
  });
}

export async function createSavingsGoal(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = SavingsGoalSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db
    .insert(savingsGoals)
    .values({
      userId,
      name: parsed.data.name.trim(),
      description: normalizeOptionalText(parsed.data.description),
      targetAmount: parsed.data.targetAmount,
      deadline: normalizeOptionalText(parsed.data.deadline),
      status: "IN_PROGRESS",
    })
    .returning();

  await logActivity({
    userId,
    entityType: "savings_goal",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidateSavingsSurfaces(inserted.id);
  return { success: true, savingsGoalId: inserted.id };
}

export async function updateSavingsGoalStatus(id: string, status: "IN_PROGRESS" | "PAUSED") {
  const userId = await getUserId();
  const existing = await db.query.savingsGoals.findFirst({
    where: (goal, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(goal.id, id), eqOperator(goal.userId, userId)),
  });
  if (!existing) return { error: "Ahorro no encontrado" };

  await db
    .update(savingsGoals)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));

  await logActivity({
    userId,
    entityType: "savings_goal",
    entityId: id,
    action: "status_changed",
    previousValue: { status: existing.status },
    newValue: { status },
  });

  revalidateSavingsSurfaces(id);
  return { success: true };
}

export async function createSavingsContribution(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = SavingsContributionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const goal = await db.query.savingsGoals.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, parsed.data.savingsGoalId), eqOperator(item.userId, userId)),
    with: { contributions: true },
  });

  if (!goal) return { error: "Ahorro no encontrado" };
  if (goal.status === "PAUSED") return { error: "El ahorro esta pausado" };

  const currentView = buildSavingsGoalView(goal);
  if (currentView.derivedStatus === "COMPLETED") return { error: "Este ahorro ya esta completado" };

  const description = normalizeOptionalText(parsed.data.description);

  const result = await db.transaction(async (tx) => {
    const [contribution] = await tx
      .insert(savingsContributions)
      .values({
        userId,
        savingsGoalId: goal.id,
        amount: parsed.data.amount,
        contributionDate: parsed.data.contributionDate,
        description,
      })
      .returning();

    const [expense] = await tx
      .insert(expenses)
      .values({
        userId,
        description: `Ahorro: ${goal.name}`,
        amount: parsed.data.amount,
        type: "OTHER",
        origin: "SAVINGS",
        savingsGoalId: goal.id,
        category: "Ahorros",
        date: parsed.data.contributionDate,
        notes: buildContributionExpenseNotes(goal.name, description),
      })
      .returning();

    await tx
      .update(savingsContributions)
      .set({ expenseId: expense.id, updatedAt: new Date() })
      .where(eq(savingsContributions.id, contribution.id));

    await tx
      .update(savingsGoals)
      .set({ updatedAt: new Date() })
      .where(eq(savingsGoals.id, goal.id));

    return { contribution, expense };
  });

  await logActivity({
    userId,
    entityType: "savings_contribution",
    entityId: result.contribution.id,
    action: "created",
    newValue: {
      savingsGoalId: goal.id,
      amount: parsed.data.amount,
      contributionDate: parsed.data.contributionDate,
      expenseId: result.expense.id,
    },
    note: `Aporte registrado para ahorro: ${goal.name}`,
  });

  await logActivity({
    userId,
    entityType: "expense",
    entityId: result.expense.id,
    action: "created",
    newValue: {
      description: `Ahorro: ${goal.name}`,
      amount: parsed.data.amount,
      origin: "SAVINGS",
      savingsGoalId: goal.id,
      savingsContributionId: result.contribution.id,
    },
    note: "Gasto automatico generado desde Ahorros",
  });

  revalidateSavingsSurfaces(goal.id);
  return { success: true, savingsContributionId: result.contribution.id };
}

export async function voidSavingsContributionFromExpense(expenseId: string, reason?: string) {
  const userId = await getUserId();
  const expense = await db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, expenseId), eqOperator(item.userId, userId)),
  });

  if (!expense) return { error: "Gasto no encontrado" };
  if (expense.origin !== "SAVINGS") return { error: "Este gasto no corresponde a un ahorro" };
  if (expense.voidedAt) return { error: "Este aporte ya esta anulado" };

  const contribution = await db.query.savingsContributions.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.expenseId, expense.id), eqOperator(item.userId, userId)),
  });

  if (!contribution) return { error: "Aporte de ahorro no encontrado" };
  if (contribution.voidedAt) return { error: "Este aporte ya esta anulado" };

  const voidedAt = new Date();
  const voidReason = reason?.trim() || "Aporte de ahorro anulado desde gasto";

  await db.transaction(async (tx) => {
    await tx
      .update(savingsContributions)
      .set({
        voidedAt,
        voidReason,
        updatedAt: voidedAt,
      })
      .where(and(eq(savingsContributions.id, contribution.id), eq(savingsContributions.userId, userId)));

    await tx
      .update(expenses)
      .set({
        voidedAt,
        voidReason,
        updatedAt: voidedAt,
      })
      .where(and(eq(expenses.id, expense.id), eq(expenses.userId, userId)));

    if (expense.savingsGoalId) {
      await tx
        .update(savingsGoals)
        .set({ updatedAt: voidedAt })
        .where(and(eq(savingsGoals.id, expense.savingsGoalId), eq(savingsGoals.userId, userId)));
    }
  });

  await logActivity({
    userId,
    entityType: "savings_contribution",
    entityId: contribution.id,
    action: "updated",
    previousValue: {
      voidedAt: contribution.voidedAt,
      voidReason: contribution.voidReason,
    },
    newValue: {
      voidedAt,
      voidReason,
    },
    note: "Aporte de ahorro anulado desde gasto",
  });

  await logActivity({
    userId,
    entityType: "expense",
    entityId: expense.id,
    action: "updated",
    previousValue: {
      voidedAt: expense.voidedAt,
      voidReason: expense.voidReason,
    },
    newValue: {
      voidedAt,
      voidReason,
    },
    note: "Gasto de ahorro anulado junto con su aporte",
  });

  revalidateSavingsSurfaces(expense.savingsGoalId ?? undefined);
  revalidatePath(`/gastos/${expense.id}`);
  return { success: true };
}
