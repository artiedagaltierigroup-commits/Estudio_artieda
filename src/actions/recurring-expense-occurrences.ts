"use server";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses, recurringExpenseOccurrences, recurringExpenses } from "@/db/schema";
import { buildRecurringPayableChecklist, getRecurringPayableChecklistRange, isRecurringPayableAlertVisible } from "@/lib/recurring-expense-checklist";
import { getRecurringOccurrenceStatus, type RecurringExpenseOccurrenceStatus } from "@/lib/recurring-expense-occurrences";
import { createRecurringExpenseRealization, lockRecurringOccurrence, syncUserRecurringExpenseOccurrences } from "@/lib/recurring-expense-sync";
import { getBusinessDate } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

function revalidateRecurringSurface() {
  for (const path of ["/", "/gastos", "/gastos/recurrentes", "/recordatorios", "/calendario"]) revalidatePath(path);
}

export async function syncRecurringExpenseOccurrences() {
  const userId = await getUserId();
  await syncUserRecurringExpenseOccurrences(userId);
}

export async function getRecurringPayableChecklist(referenceDate = new Date()) {
  await syncRecurringExpenseOccurrences();

  const userId = await getUserId();
  const checklistRange = getRecurringPayableChecklistRange(referenceDate);

  const rows = await db
    .select({
      occurrenceId: recurringExpenseOccurrences.id,
      dueDate: recurringExpenseOccurrences.dueDate,
      status: recurringExpenseOccurrences.status,
      paidAt: recurringExpenseOccurrences.paidAt,
      expenseId: recurringExpenseOccurrences.expenseId,
      recurringId: recurringExpenses.id,
      description: recurringExpenses.description,
      amount: recurringExpenses.amount,
      type: recurringExpenses.type,
      category: recurringExpenses.category,
      priority: recurringExpenses.priority,
      notifyDaysBefore: recurringExpenses.notifyDaysBefore,
    })
    .from(recurringExpenseOccurrences)
    .innerJoin(recurringExpenses, eq(recurringExpenseOccurrences.recurringExpenseId, recurringExpenses.id))
    .where(
      and(
        eq(recurringExpenseOccurrences.userId, userId),
        eq(recurringExpenses.userId, userId),
        eq(recurringExpenses.mode, "PAYABLE"),
        gte(recurringExpenseOccurrences.dueDate, checklistRange.from),
        lte(recurringExpenseOccurrences.dueDate, checklistRange.to)
      )
    )
    .orderBy(asc(recurringExpenseOccurrences.dueDate));

  return buildRecurringPayableChecklist(rows);
}

export async function getRecurringPayableAlerts(referenceDate = new Date()) {
  const checklist = await getRecurringPayableChecklist(referenceDate);
  const todayKey = getBusinessDate(referenceDate);

  return checklist.pending
    .filter((item) => isRecurringPayableAlertVisible(item, todayKey))
    .map((item) => ({
      id: item.occurrenceId,
      title: item.description,
      reminderDate: new Date(`${item.dueDate}T12:00:00.000Z`),
      priority: item.priority,
      amount: Number(item.amount),
      status: item.status as Extract<RecurringExpenseOccurrenceStatus, "PENDING" | "OVERDUE">,
    }));
}

export async function markRecurringOccurrencePaid(id: string) {
  const userId = await getUserId();
  const result = await db.transaction(async (tx) => {
    const row = await lockRecurringOccurrence(tx, id, userId);
    if (!row) return { error: "Vencimiento recurrente no encontrado" };
    if (row.recurring.mode !== "PAYABLE") return { error: "Solo se pueden marcar pagos manuales en gastos por pagar" };
    if (row.occurrence.status === "PAID") return { success: true };
    if (row.occurrence.status === "CANCELLED") return { error: "Reabri el vencimiento anulado antes de registrar otro pago" };
    if (row.occurrence.expenseId || row.occurrence.status === "GENERATED") {
      return { error: "Este vencimiento ya tiene un gasto registrado. Revisalo antes de registrar otro pago" };
    }
    const expense = await createRecurringExpenseRealization(tx, row.recurring, row.occurrence.dueDate, getBusinessDate());
    await tx.update(recurringExpenseOccurrences).set({ status: "PAID", expenseId: expense.id, paidAt: new Date(), updatedAt: new Date() }).where(eq(recurringExpenseOccurrences.id, id));
    return { success: true };
  });
  if ("error" in result) return result;
  revalidateRecurringSurface();
  return result;
}

export async function reopenRecurringOccurrence(id: string) {
  const userId = await getUserId();
  const result = await db.transaction(async (tx) => {
    const row = await lockRecurringOccurrence(tx, id, userId);
    if (!row) return { error: "Vencimiento recurrente no encontrado" };
    if (row.recurring.mode !== "PAYABLE") return { error: "Solo se pueden reabrir gastos por pagar" };
    if (row.occurrence.expenseId) {
      const [expense] = await tx.select().from(expenses).where(and(eq(expenses.id, row.occurrence.expenseId), eq(expenses.userId, userId))).for("update");
      if (expense && !expense.voidedAt) {
        const voidedAt = new Date();
        const voidReason = "Pago recurrente reabierto desde checklist";
        await tx.update(expenses).set({ voidedAt, voidReason, updatedAt: voidedAt }).where(eq(expenses.id, expense.id));
        await logActivity({ userId, entityType: "expense", entityId: expense.id, action: "updated", previousValue: { voidedAt: expense.voidedAt, voidReason: expense.voidReason }, newValue: { voidedAt, voidReason }, note: "Gasto real anulado al desmarcar gasto por pagar" }, tx);
      }
    }
    const status = getRecurringOccurrenceStatus({ mode: "PAYABLE", dueDate: row.occurrence.dueDate, today: getBusinessDate() });
    await tx.update(recurringExpenseOccurrences).set({ status, expenseId: null, paidAt: null, updatedAt: new Date() }).where(eq(recurringExpenseOccurrences.id, id));
    return { success: true };
  });
  if ("error" in result) return result;
  revalidateRecurringSurface();
  return result;
}
