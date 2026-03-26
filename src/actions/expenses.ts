"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { filterExpensesByFilters } from "@/lib/expense-insights";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

const ExpenseSchema = z.object({
  description: z.string().trim().min(1, "La descripcion es obligatoria"),
  amount: z.string().min(1, "El monto es obligatorio"),
  type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
  category: z.string().optional(),
  date: z.string().min(1, "La fecha es obligatoria"),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toExpenseValues(data: z.infer<typeof ExpenseSchema>) {
  return {
    description: data.description.trim(),
    amount: data.amount,
    type: data.type,
    category: normalizeOptionalText(data.category),
    date: data.date,
    receiptUrl: normalizeOptionalText(data.receiptUrl),
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

export async function getExpenses(filters?: { query?: string; type?: string }) {
  const userId = await getUserId();
  const rows = await db.query.expenses.findMany({
    where: (item, { and: andOperator, eq: eqOperator, isNull: isNullOperator }) =>
      andOperator(eqOperator(item.userId, userId), isNullOperator(item.voidedAt)),
    orderBy: (item, { desc }) => [desc(item.date), desc(item.createdAt)],
  });

  return filterExpensesByFilters(rows, filters ?? {});
}

export async function getExpense(id: string) {
  const userId = await getUserId();
  return db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
}

export async function createExpense(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(expenses).values({ ...toExpenseValues(parsed.data), userId }).returning();

  await logActivity({
    userId,
    entityType: "expense",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/gastos");
  revalidatePath(`/gastos/${inserted.id}`);
  return { success: true, expenseId: inserted.id };
}

export async function updateExpense(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Gasto no encontrado" };

  await db
    .update(expenses)
    .set({ ...toExpenseValues(parsed.data), updatedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

  await logActivity({
    userId,
    entityType: "expense",
    entityId: id,
    action: "updated",
    previousValue: existing as Record<string, unknown>,
    newValue: parsed.data,
  });

  revalidatePath("/gastos");
  revalidatePath(`/gastos/${id}`);
  revalidatePath(`/gastos/${id}/editar`);
  return { success: true };
}

export async function voidExpense(id: string, reason?: string) {
  const userId = await getUserId();
  const existing = await db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Gasto no encontrado" };
  if (existing.voidedAt) return { error: "El gasto ya esta anulado" };

  const voidedAt = new Date();

  await db
    .update(expenses)
    .set({
      voidedAt,
      voidReason: reason?.trim() || null,
      updatedAt: voidedAt,
    })
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

  await logActivity({
    userId,
    entityType: "expense",
    entityId: id,
    action: "updated",
    previousValue: {
      voidedAt: existing.voidedAt,
      voidReason: existing.voidReason,
    },
    newValue: {
      voidedAt,
      voidReason: reason?.trim() || null,
    },
    note: "Gasto anulado",
  });

  revalidatePath("/gastos");
  revalidatePath(`/gastos/${id}`);
  return { success: true };
}

export async function deleteExpense(id: string) {
  const userId = await getUserId();
  const existing = await db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Gasto no encontrado" };

  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

  await logActivity({
    userId,
    entityType: "expense",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
  });

  revalidatePath("/gastos");
  return { success: true };
}
