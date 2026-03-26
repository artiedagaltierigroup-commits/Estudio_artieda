"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { calculateMonthlyProjection } from "@/lib/recurring-expense-projection";
import { createClient } from "@/lib/supabase/server";

const RecurringExpenseSchema = z.object({
  description: z.string().trim().min(1, "La descripcion es obligatoria"),
  amount: z.string().min(1, "El monto es obligatorio"),
  type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
  category: z.string().optional(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().optional(),
  active: z.string().optional(),
  notes: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toRecurringValues(data: z.infer<typeof RecurringExpenseSchema>) {
  return {
    description: data.description.trim(),
    amount: data.amount,
    type: data.type,
    category: normalizeOptionalText(data.category),
    frequency: data.frequency,
    startDate: data.startDate,
    endDate: normalizeOptionalText(data.endDate),
    active: data.active === "true" || data.active === "on",
    notes: normalizeOptionalText(data.notes),
  };
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getRecurringExpenses() {
  const userId = await getUserId();
  return db.query.recurringExpenses.findMany({
    where: (expense, { eq: eqOperator }) => eqOperator(expense.userId, userId),
    orderBy: (expense, { asc }) => [asc(expense.description)],
  });
}

export async function getRecurringExpense(id: string) {
  const userId = await getUserId();
  return db.query.recurringExpenses.findFirst({
    where: (expense, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(expense.id, id), eqOperator(expense.userId, userId)),
  });
}

export async function createRecurringExpense(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = RecurringExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(recurringExpenses).values({ ...toRecurringValues(parsed.data), userId }).returning();

  revalidatePath("/gastos/recurrentes");
  return { success: true, recurringExpenseId: inserted.id };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = RecurringExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db
    .update(recurringExpenses)
    .set({
      ...toRecurringValues(parsed.data),
      updatedAt: new Date(),
    })
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));

  revalidatePath("/gastos/recurrentes");
  revalidatePath(`/gastos/recurrentes/${id}/editar`);
  return { success: true };
}

export async function deleteRecurringExpense(id: string) {
  const userId = await getUserId();
  await db
    .delete(recurringExpenses)
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
  revalidatePath("/gastos/recurrentes");
  return { success: true };
}

export async function getMonthlyProjection(targetMonth: Date): Promise<number> {
  const userId = await getUserId();
  const allRecurring = await db.query.recurringExpenses.findMany({
    where: (expense, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(expense.userId, userId), eqOperator(expense.active, true)),
  });

  return calculateMonthlyProjection(allRecurring, targetMonth);
}
