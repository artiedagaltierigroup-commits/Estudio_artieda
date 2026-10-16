"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { expenses, recurringExpenses, recurringExpenseOccurrences } from "@/db/schema";
import { filterExpensesByFilters } from "@/lib/expense-insights";
import { requireAdminAccess } from "@/lib/workspace-access";
import { logActivity } from "@/lib/activity-log";
import { ChargeDateSchema, ChargeMoneySchema } from "@/lib/charge-money";

const ExpenseSchema = z.object({
  description: z.string().trim().min(1, "La descripcion es obligatoria"),
  amount: ChargeMoneySchema,
  type: z.enum(["OPERATIVE", "TAX", "SERVICE", "OTHER"]).default("OPERATIVE"),
  category: z.string().optional(),
  date: ChargeDateSchema,
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
  return (await requireAdminAccess()).ownerUserId;
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
  if (existing.origin === "SAVINGS") return { error: "Los gastos de ahorro se editan desde Ahorros" };

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
  const result = await db.transaction(async (tx) => {
    const initial = await tx.query.expenses.findFirst({ where: and(eq(expenses.id, id), eq(expenses.userId, userId)) });
    if (!initial) return { error: "Gasto no encontrado" };
    if (initial.origin === "SAVINGS") return { error: "Los gastos de ahorro se gestionan desde Ahorros" };
    // Use the same lock order as generation, payment and reopening.
    if (initial.recurringExpenseId) {
      await tx.select().from(recurringExpenses).where(and(eq(recurringExpenses.id, initial.recurringExpenseId), eq(recurringExpenses.userId, userId))).for("update");
    }
    const linked = await tx.select().from(recurringExpenseOccurrences).where(and(eq(recurringExpenseOccurrences.expenseId, id), eq(recurringExpenseOccurrences.userId, userId))).for("update");
    const [existing] = await tx.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).for("update");
    if (!existing) return { error: "Gasto no encontrado" };
    if (existing.voidedAt) return { error: "El gasto ya esta anulado" };
    const voidedAt = new Date();
    const voidReason = reason?.trim() || null;
    await tx.update(expenses).set({ voidedAt, voidReason, updatedAt: voidedAt }).where(eq(expenses.id, id));
    for (const occurrence of linked) {
      await tx.update(recurringExpenseOccurrences).set({ status: "CANCELLED", paidAt: null, updatedAt: voidedAt }).where(eq(recurringExpenseOccurrences.id, occurrence.id));
    }
    await logActivity({ userId, entityType: "expense", entityId: id, action: "updated", previousValue: { voidedAt: existing.voidedAt, voidReason: existing.voidReason }, newValue: { voidedAt, voidReason }, note: "Gasto anulado" }, tx);
    return { success: true };
  });
  if ("error" in result) return result;
  for (const path of ["/", "/gastos", `/gastos/${id}`, "/gastos/recurrentes", "/recordatorios", "/calendario"]) revalidatePath(path);
  return result;
}
export async function deleteExpense(id: string) {
  const userId = await getUserId();
  const existing = await db.query.expenses.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Gasto no encontrado" };
  if (existing.origin === "SAVINGS") return { error: "Los gastos de ahorro se gestionan desde Ahorros" };

  if (existing.origin === "RECURRING_AUTOMATIC" || existing.origin === "RECURRING_PAYABLE") return { error: "Los gastos recurrentes conservan su historia; usa Anular" };

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
