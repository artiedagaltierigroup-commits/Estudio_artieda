"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { resolveExistingRecurringStartDate } from "@/lib/recurring-expense-normalizers";
import { calculateMonthlyProjection } from "@/lib/recurring-expense-projection";
import { createClient } from "@/lib/supabase/server";
import { syncRecurringExpenseOccurrences } from "./recurring-expense-occurrences";

const RecurringExpenseSchema = z
  .object({
    description: z.string().trim().min(1, "La descripcion es obligatoria"),
    amount: z.string().min(1, "El monto es obligatorio"),
    type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
    mode: z.enum(["AUTOMATIC", "PAYABLE"]).default("PAYABLE"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    category: z.string().optional(),
    frequency: z.enum(["monthly", "quarterly", "semiannual", "yearly"]).default("monthly"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notifyDaysBefore: z.string().optional(),
    payableDayOfMonth: z.string().optional(),
    active: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "AUTOMATIC" && !data.startDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "La fecha de inicio es obligatoria para gastos programados",
      });
    }

    if (data.mode === "PAYABLE") {
      const notifyDays = Number(data.notifyDaysBefore ?? "0");
      const payableDay = Number(data.payableDayOfMonth ?? "");

      if (!Number.isInteger(payableDay) || payableDay < 1 || payableDay > 31) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payableDayOfMonth"],
          message: "El dia de pago debe estar entre 1 y 31",
        });
      }

      if (!Number.isInteger(notifyDays) || notifyDays < 0 || notifyDays > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["notifyDaysBefore"],
          message: "Los dias de aviso deben estar entre 0 y 15",
        });
      }
    }
  });

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toRecurringValues(data: z.infer<typeof RecurringExpenseSchema>, startDate: string) {
  const mode = data.mode;
  return {
    description: data.description.trim(),
    amount: data.amount,
    type: data.type,
    mode,
    priority: data.priority,
    category: normalizeOptionalText(data.category),
    frequency: data.frequency,
    startDate,
    endDate: mode === "PAYABLE" ? null : normalizeOptionalText(data.endDate),
    notifyDaysBefore: mode === "PAYABLE" ? Number(data.notifyDaysBefore ?? "0") : 0,
    payableDayOfMonth: mode === "PAYABLE" ? Number(data.payableDayOfMonth ?? "1") : null,
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
  await syncRecurringExpenseOccurrences(new Date());
  return db.query.recurringExpenses.findMany({
    where: (expense, { eq: eqOperator }) => eqOperator(expense.userId, userId),
    orderBy: (expense, { asc }) => [asc(expense.description)],
  });
}

export async function getRecurringExpense(id: string) {
  const userId = await getUserId();
  await syncRecurringExpenseOccurrences(new Date());
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

  const startDate = resolveExistingRecurringStartDate(null, parsed.data.mode, parsed.data.startDate, new Date());
  const [inserted] = await db
    .insert(recurringExpenses)
    .values({ ...toRecurringValues(parsed.data, startDate), userId })
    .returning();

  revalidatePath("/gastos/recurrentes");
  revalidatePath("/");
  revalidatePath("/recordatorios");
  return { success: true, recurringExpenseId: inserted.id };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = RecurringExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.query.recurringExpenses.findFirst({
    where: (expense, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(expense.id, id), eqOperator(expense.userId, userId)),
  });
  if (!existing) return { error: "Gasto recurrente no encontrado" };

  const startDate = resolveExistingRecurringStartDate(existing, parsed.data.mode, parsed.data.startDate, new Date());

  await db
    .update(recurringExpenses)
    .set({
      ...toRecurringValues(parsed.data, startDate),
      updatedAt: new Date(),
    })
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));

  revalidatePath("/gastos/recurrentes");
  revalidatePath(`/gastos/recurrentes/${id}/editar`);
  revalidatePath("/");
  revalidatePath("/recordatorios");
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
      andOperator(eqOperator(expense.userId, userId), eqOperator(expense.active, true), eqOperator(expense.mode, "AUTOMATIC")),
  });

  return calculateMonthlyProjection(allRecurring, targetMonth);
}
