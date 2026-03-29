"use server";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { addDays, endOfMonth, format, isAfter, isBefore, parseISO, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses, recurringExpenseOccurrences, recurringExpenses } from "@/db/schema";
import {
  getReminderWindowStart,
  getRecurringOccurrenceStatus,
  listRecurringDueDates,
  type RecurringExpenseOccurrenceStatus,
} from "@/lib/recurring-expense-occurrences";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

type RecurringExpenseRow = typeof recurringExpenses.$inferSelect;
type RecurringOccurrenceRow = typeof recurringExpenseOccurrences.$inferSelect;

const PRIORITY_WEIGHT = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
} as const;

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

function buildExpenseNote(recurring: RecurringExpenseRow, dueDate: string, modeLabel: string) {
  const noteParts = [`Generado desde ${modeLabel}.`, `Vencimiento: ${dueDate}.`];
  if (recurring.notes?.trim()) noteParts.push(recurring.notes.trim());
  return noteParts.join(" ");
}

async function createRecurringExpenseRealization(params: {
  recurring: RecurringExpenseRow;
  userId: string;
  date: string;
  dueDate: string;
  origin: "RECURRING_AUTOMATIC" | "RECURRING_PAYABLE";
}) {
  const [inserted] = await db
    .insert(expenses)
    .values({
      userId: params.userId,
      description: params.recurring.description,
      amount: params.recurring.amount,
      type: params.recurring.type,
      origin: params.origin,
      recurringExpenseId: params.recurring.id,
      category: params.recurring.category,
      date: params.date,
      notes: buildExpenseNote(
        params.recurring,
        params.dueDate,
        params.origin === "RECURRING_AUTOMATIC" ? "gasto programado" : "gasto por pagar"
      ),
    })
    .returning();

  await logActivity({
    userId: params.userId,
    entityType: "expense",
    entityId: inserted.id,
    action: "created",
    newValue: {
      description: params.recurring.description,
      amount: params.recurring.amount,
      origin: params.origin,
      recurringExpenseId: params.recurring.id,
    },
    note:
      params.origin === "RECURRING_AUTOMATIC"
        ? "Gasto real generado automaticamente desde recurrente programado"
        : "Gasto real generado al marcar pago de recurrente por pagar",
  });

  return inserted;
}

function revalidateRecurringSurface() {
  revalidatePath("/");
  revalidatePath("/gastos");
  revalidatePath("/gastos/recurrentes");
  revalidatePath("/recordatorios");
  revalidatePath("/calendario");
}

async function syncRecurringExpenseOccurrencesForRows(recurringRows: RecurringExpenseRow[], referenceDate: Date) {
  if (recurringRows.length === 0) return;

  const todayKey = format(referenceDate, "yyyy-MM-dd");
  const horizonKey = format(endOfMonth(addDays(referenceDate, 15)), "yyyy-MM-dd");
  const recurringIds = recurringRows.map((item) => item.id);

  const existingRows = await db.query.recurringExpenseOccurrences.findMany({
    where: (item, { and: andOperator, inArray: inArrayOperator, lte: lteOperator }) =>
      andOperator(inArrayOperator(item.recurringExpenseId, recurringIds), lteOperator(item.dueDate, horizonKey)),
  });

  const existingByKey = new Map<string, RecurringOccurrenceRow>(
    existingRows.map((item) => [`${item.recurringExpenseId}:${item.dueDate}`, item] as const)
  );

  for (const recurring of recurringRows) {
    const dueDates = listRecurringDueDates(
      {
        active: recurring.active,
        mode: recurring.mode,
        frequency: recurring.frequency,
        startDate: recurring.startDate,
        endDate: recurring.endDate,
        payableDayOfMonth: recurring.payableDayOfMonth,
      },
      { from: recurring.startDate, to: horizonKey }
    );

    for (const dueDate of dueDates) {
      const key = `${recurring.id}:${dueDate}`;
      const existing = existingByKey.get(key);
      const derivedStatus = getRecurringOccurrenceStatus({ mode: recurring.mode, dueDate, today: todayKey });

      if (!existing) {
        if (recurring.mode === "AUTOMATIC" && derivedStatus !== "GENERATED") continue;

        let expenseId: string | null = null;
        if (recurring.mode === "AUTOMATIC") {
          const expense = await createRecurringExpenseRealization({
            recurring,
            userId: recurring.userId,
            date: dueDate,
            dueDate,
            origin: "RECURRING_AUTOMATIC",
          });
          expenseId = expense.id;
        }

        const [inserted] = await db
          .insert(recurringExpenseOccurrences)
          .values({
            userId: recurring.userId,
            recurringExpenseId: recurring.id,
            dueDate,
            status: recurring.mode === "AUTOMATIC" ? "GENERATED" : derivedStatus,
            expenseId,
            paidAt: recurring.mode === "AUTOMATIC" ? new Date(`${dueDate}T12:00:00.000Z`) : null,
          })
          .returning();

        existingByKey.set(key, inserted);
        continue;
      }

      if (existing.status === "PAID") continue;

      if (recurring.mode === "AUTOMATIC") {
        if (!existing.expenseId && derivedStatus === "GENERATED") {
          const expense = await createRecurringExpenseRealization({
            recurring,
            userId: recurring.userId,
            date: dueDate,
            dueDate,
            origin: "RECURRING_AUTOMATIC",
          });

          await db
            .update(recurringExpenseOccurrences)
            .set({
              status: "GENERATED",
              expenseId: expense.id,
              paidAt: new Date(`${dueDate}T12:00:00.000Z`),
              updatedAt: new Date(),
            })
            .where(eq(recurringExpenseOccurrences.id, existing.id));
        }

        continue;
      }

      if (existing.status !== derivedStatus) {
        await db
          .update(recurringExpenseOccurrences)
          .set({ status: derivedStatus, updatedAt: new Date() })
          .where(eq(recurringExpenseOccurrences.id, existing.id));
      }
    }
  }
}

export async function syncRecurringExpenseOccurrences(referenceDate = new Date()) {
  const userId = await getUserId();
  const recurringRows = await db.query.recurringExpenses.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.userId, userId), eqOperator(item.active, true)),
  });

  await syncRecurringExpenseOccurrencesForRows(recurringRows, referenceDate);
}

export async function syncAllRecurringExpenseOccurrences(referenceDate = new Date()) {
  const recurringRows = await db.query.recurringExpenses.findMany({
    where: (item, { eq: eqOperator }) => eqOperator(item.active, true),
  });

  await syncRecurringExpenseOccurrencesForRows(recurringRows, referenceDate);
}

export async function getRecurringPayableChecklist(referenceDate = new Date()) {
  await syncRecurringExpenseOccurrences(referenceDate);

  const userId = await getUserId();
  const todayKey = format(referenceDate, "yyyy-MM-dd");
  const monthStartKey = format(startOfMonth(referenceDate), "yyyy-MM-dd");
  const horizonKey = format(addDays(referenceDate, 15), "yyyy-MM-dd");

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
        eq(recurringExpenses.mode, "PAYABLE"),
        gte(recurringExpenseOccurrences.dueDate, monthStartKey),
        lte(recurringExpenseOccurrences.dueDate, horizonKey)
      )
    )
    .orderBy(asc(recurringExpenseOccurrences.dueDate));

  const visibleRows = rows.filter((row) => {
    if (row.status === "PAID") return true;
    return getReminderWindowStart(row.dueDate, row.notifyDaysBefore) <= todayKey;
  });

  const pending = visibleRows
    .filter((row) => row.status !== "PAID")
    .sort((left, right) => {
      const leftOverdue = left.status === "OVERDUE";
      const rightOverdue = right.status === "OVERDUE";
      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
      const dateDelta = left.dueDate.localeCompare(right.dueDate);
      if (dateDelta !== 0) return dateDelta;
      return PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
    });

  const paid = visibleRows
    .filter((row) => row.status === "PAID")
    .sort((left, right) => right.dueDate.localeCompare(left.dueDate));

  return {
    pending: pending.map((item) => ({ ...item, status: item.status as "PENDING" | "OVERDUE" })),
    paid: paid.map((item) => ({ ...item, status: "PAID" as const })),
    summary: {
      pending: pending.length,
      overdue: pending.filter((item) => item.status === "OVERDUE").length,
      paid: paid.length,
    },
  };
}

export async function getRecurringPayableAlerts(referenceDate = new Date()) {
  const checklist = await getRecurringPayableChecklist(referenceDate);

  return checklist.pending.map((item) => ({
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
  await syncRecurringExpenseOccurrences(new Date());

  const [row] = await db
    .select({
      occurrence: recurringExpenseOccurrences,
      recurring: recurringExpenses,
    })
    .from(recurringExpenseOccurrences)
    .innerJoin(recurringExpenses, eq(recurringExpenseOccurrences.recurringExpenseId, recurringExpenses.id))
    .where(and(eq(recurringExpenseOccurrences.id, id), eq(recurringExpenseOccurrences.userId, userId)))
    .limit(1);

  if (!row) return { error: "Vencimiento recurrente no encontrado" };
  if (row.recurring.mode !== "PAYABLE") return { error: "Solo se pueden marcar pagos manuales en gastos por pagar" };
  if (row.occurrence.status === "PAID") return { success: true };

  const paymentDate = format(new Date(), "yyyy-MM-dd");
  const expense = await createRecurringExpenseRealization({
    recurring: row.recurring,
    userId,
    date: paymentDate,
    dueDate: row.occurrence.dueDate,
    origin: "RECURRING_PAYABLE",
  });

  await db
    .update(recurringExpenseOccurrences)
    .set({
      status: "PAID",
      expenseId: expense.id,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(recurringExpenseOccurrences.id, row.occurrence.id));

  revalidateRecurringSurface();
  return { success: true };
}

export async function reopenRecurringOccurrence(id: string) {
  const userId = await getUserId();

  const [row] = await db
    .select({
      occurrence: recurringExpenseOccurrences,
      recurring: recurringExpenses,
    })
    .from(recurringExpenseOccurrences)
    .innerJoin(recurringExpenses, eq(recurringExpenseOccurrences.recurringExpenseId, recurringExpenses.id))
    .where(and(eq(recurringExpenseOccurrences.id, id), eq(recurringExpenseOccurrences.userId, userId)))
    .limit(1);

  if (!row) return { error: "Vencimiento recurrente no encontrado" };
  if (row.recurring.mode !== "PAYABLE") return { error: "Solo se pueden reabrir gastos por pagar" };

  if (row.occurrence.expenseId) {
    const existingExpense = await db.query.expenses.findFirst({
      where: (item, { and: andOperator, eq: eqOperator }) =>
        andOperator(eqOperator(item.id, row.occurrence.expenseId!), eqOperator(item.userId, userId)),
    });

    if (existingExpense && !existingExpense.voidedAt) {
      const voidedAt = new Date();
      await db
        .update(expenses)
        .set({
          voidedAt,
          voidReason: "Pago recurrente reabierto desde checklist",
          updatedAt: voidedAt,
        })
        .where(eq(expenses.id, existingExpense.id));

      await logActivity({
        userId,
        entityType: "expense",
        entityId: existingExpense.id,
        action: "updated",
        previousValue: { voidedAt: existingExpense.voidedAt, voidReason: existingExpense.voidReason },
        newValue: { voidedAt, voidReason: "Pago recurrente reabierto desde checklist" },
        note: "Gasto real anulado al desmarcar gasto por pagar",
      });
    }
  }

  const nextStatus = getRecurringOccurrenceStatus({
    mode: "PAYABLE",
    dueDate: row.occurrence.dueDate,
    today: format(new Date(), "yyyy-MM-dd"),
  });

  await db
    .update(recurringExpenseOccurrences)
    .set({
      status: nextStatus === "OVERDUE" ? "OVERDUE" : "PENDING",
      expenseId: null,
      paidAt: null,
      updatedAt: new Date(),
    })
    .where(eq(recurringExpenseOccurrences.id, row.occurrence.id));

  revalidateRecurringSurface();
  return { success: true };
}
