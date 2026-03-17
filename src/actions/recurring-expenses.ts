"use server";

import {
  addMonths,
  addQuarters,
  addYears,
  endOfMonth,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

const RecurringExpenseSchema = z.object({
  description: z.string().min(1, "La descripcion es obligatoria"),
  amount: z.string().min(1, "El monto es obligatorio"),
  type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().optional(),
  active: z.string().optional(),
  notes: z.string().optional(),
});

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

export async function createRecurringExpense(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = RecurringExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.insert(recurringExpenses).values({
    ...parsed.data,
    active: parsed.data.active === "true" || parsed.data.active === "on",
    userId,
  });

  revalidatePath("/gastos/recurrentes");
  return { success: true };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = RecurringExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db
    .update(recurringExpenses)
    .set({
      ...parsed.data,
      active: parsed.data.active === "true" || parsed.data.active === "on",
      updatedAt: new Date(),
    })
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));

  revalidatePath("/gastos/recurrentes");
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

  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  let total = 0;

  for (const recurring of allRecurring) {
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
        case "yearly":
          cursor = addYears(cursor, 1);
          break;
      }
    }

    if (hits) total += parseFloat(recurring.amount);
  }

  return total;
}
