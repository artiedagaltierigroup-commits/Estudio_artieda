"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { recurringExpenseOccurrences, recurringExpenses } from "@/db/schema";
import { resolveExistingRecurringStartDate } from "@/lib/recurring-expense-normalizers";
import { calculateMonthlyProjection } from "@/lib/recurring-expense-projection";
import { listRecurringDueDates } from "@/lib/recurring-expense-occurrences";
import { requireAdminAccess } from "@/lib/workspace-access";
import { ChargeMoneySchema, OptionalChargeDateSchema } from "@/lib/charge-money";
import { syncRecurringExpenseOccurrences } from "./recurring-expense-occurrences";

const RecurringExpenseSchema = z
  .object({
    description: z.string().trim().min(1, "La descripcion es obligatoria"),
    amount: ChargeMoneySchema,
    type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
    mode: z.enum(["AUTOMATIC", "PAYABLE"]).default("PAYABLE"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    category: z.string().optional(),
    frequency: z.enum(["monthly", "quarterly", "semiannual", "yearly"]).default("monthly"),
    startDate: OptionalChargeDateSchema,
    endDate: OptionalChargeDateSchema,
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
  return (await requireAdminAccess()).ownerUserId;
}

export async function getRecurringExpenses() {
  const userId = await getUserId();
  await syncRecurringExpenseOccurrences();
  return db.query.recurringExpenses.findMany({
    where: (expense, { eq: eqOperator }) => eqOperator(expense.userId, userId),
    orderBy: (expense, { asc }) => [asc(expense.description)],
  });
}

export async function getRecurringExpense(id: string) {
  const userId = await getUserId();
  await syncRecurringExpenseOccurrences();
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
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(recurringExpenses).where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId))).for("update");
    if (!row) return { error: "Gasto recurrente no encontrado" };
    const history = await tx.query.recurringExpenseOccurrences.findFirst({ where: eq(recurringExpenseOccurrences.recurringExpenseId, id) });
    if (history) return { error: "Este recurrente tiene historial. Desactivalo para detener nuevos vencimientos sin borrar su historia" };
    await tx.delete(recurringExpenses).where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
    return { success: true };
  });
  if ("error" in result) return result;
  revalidatePath("/gastos/recurrentes");
  return result;
}

export async function getMonthlyProjection(targetMonth: Date): Promise<number> {
  const userId = await getUserId();
  const allRecurring = await db.query.recurringExpenses.findMany({
    where: (expense, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(expense.userId, userId), eqOperator(expense.active, true), eqOperator(expense.mode, "AUTOMATIC")),
  });

  return calculateMonthlyProjection(allRecurring, targetMonth);
}

export async function getPendingRecurringProjection(from: string, to: string): Promise<number> {
  const userId = await getUserId();
  const [rows, occurrences] = await Promise.all([
    db.query.recurringExpenses.findMany({ where: and(eq(recurringExpenses.userId, userId), eq(recurringExpenses.active, true), eq(recurringExpenses.mode, "AUTOMATIC")) }),
    db.query.recurringExpenseOccurrences.findMany({ where: and(eq(recurringExpenseOccurrences.userId, userId), gte(recurringExpenseOccurrences.dueDate, `${from.slice(0, 7)}-01`), lte(recurringExpenseOccurrences.dueDate, to)) }),
  ]);
  const realizedPeriods = new Set(occurrences.filter((item) => item.expenseId || item.status === "CANCELLED" || item.status === "GENERATED" || item.status === "PAID")
    .map((item) => `${item.recurringExpenseId}:${item.dueDate.slice(0, 7)}`));
  return rows.reduce((total, recurring) => total + listRecurringDueDates(recurring, { from, to })
    .filter((date) => !realizedPeriods.has(`${recurring.id}:${date.slice(0, 7)}`)).length * Number(recurring.amount), 0);
}
