import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { addDays, endOfMonth, format, parseISO } from "date-fns";
import { db } from "@/db";
import { expenses, recurringExpenseOccurrences, recurringExpenses } from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { getBusinessDate } from "@/lib/business-date";
import { getRecurringOccurrenceStatus, listRecurringDatesNeedingSync, type ExistingRecurringOccurrence } from "@/lib/recurring-expense-occurrences";

type RecurringRow = typeof recurringExpenses.$inferSelect;
export type RecurringTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function buildRecurringExpenseNote(recurring: RecurringRow, dueDate: string, modeLabel: string) {
  return [`Generado desde ${modeLabel}.`, `Vencimiento: ${dueDate}.`, recurring.notes?.trim()].filter(Boolean).join(" ");
}

export async function createRecurringExpenseRealization(tx: RecurringTransaction, recurring: RecurringRow, dueDate: string, date: string) {
  const origin = recurring.mode === "AUTOMATIC" ? "RECURRING_AUTOMATIC" : "RECURRING_PAYABLE";
  const [expense] = await tx.insert(expenses).values({
    userId: recurring.userId, description: recurring.description, amount: recurring.amount,
    type: recurring.type, origin, recurringExpenseId: recurring.id, category: recurring.category, date,
    notes: buildRecurringExpenseNote(recurring, dueDate, recurring.mode === "AUTOMATIC" ? "gasto programado" : "gasto por pagar"),
  }).returning();
  await logActivity({
    userId: recurring.userId, entityType: "expense", entityId: expense.id, action: "created",
    newValue: { description: recurring.description, amount: recurring.amount, origin, recurringExpenseId: recurring.id },
    note: recurring.mode === "AUTOMATIC" ? "Gasto real generado automaticamente desde recurrente programado" : "Gasto real generado al marcar pago de recurrente por pagar",
  }, tx);
  return expense;
}

/** Every mutation locks parent, occurrence, then expense, in that order. */
export async function lockRecurringOccurrence(tx: RecurringTransaction, id: string, userId: string) {
  const initial = await tx.query.recurringExpenseOccurrences.findFirst({ where: and(eq(recurringExpenseOccurrences.id, id), eq(recurringExpenseOccurrences.userId, userId)) });
  if (!initial) return null;
  const [recurring] = await tx.select().from(recurringExpenses)
    .where(and(eq(recurringExpenses.id, initial.recurringExpenseId), eq(recurringExpenses.userId, userId))).for("update");
  if (!recurring) return null;
  const [occurrence] = await tx.select().from(recurringExpenseOccurrences)
    .where(and(eq(recurringExpenseOccurrences.id, id), eq(recurringExpenseOccurrences.userId, userId))).for("update");
  return occurrence ? { recurring, occurrence } : null;
}

async function syncRows(rows: RecurringRow[], referenceDate: Date) {
  if (rows.length === 0) return;
  const today = getBusinessDate(referenceDate);
  const horizon = format(endOfMonth(addDays(parseISO(today), 15)), "yyyy-MM-dd");
  const existingByRecurring = new Map<string, ExistingRecurringOccurrence[]>();
  // A normal page view should read existing periods once, not lock and recheck each month.
  for (let offset = 0; offset < rows.length; offset += 250) {
    const ids = rows.slice(offset, offset + 250).map((row) => row.id);
    const existing = await db.select({
      recurringExpenseId: recurringExpenseOccurrences.recurringExpenseId,
      dueDate: recurringExpenseOccurrences.dueDate,
      status: recurringExpenseOccurrences.status,
      expenseId: recurringExpenseOccurrences.expenseId,
    }).from(recurringExpenseOccurrences).where(inArray(recurringExpenseOccurrences.recurringExpenseId, ids));
    for (const occurrence of existing) {
      const group = existingByRecurring.get(occurrence.recurringExpenseId) ?? [];
      group.push(occurrence);
      existingByRecurring.set(occurrence.recurringExpenseId, group);
    }
  }

  for (const candidate of rows) {
    const range = { from: candidate.startDate, to: horizon, today };
    if (listRecurringDatesNeedingSync(candidate, existingByRecurring.get(candidate.id) ?? [], range).length === 0) continue;

    await db.transaction(async (tx) => {
      // Re-read after acquiring the lock: stale snapshots must not recreate or duplicate a payment.
      const [recurring] = await tx.select().from(recurringExpenses)
        .where(and(eq(recurringExpenses.id, candidate.id), eq(recurringExpenses.userId, candidate.userId))).for("update");
      if (!recurring?.active) return;
      const lockedOccurrences = await tx.select().from(recurringExpenseOccurrences)
        .where(eq(recurringExpenseOccurrences.recurringExpenseId, recurring.id)).for("update");
      const lockedByDate = new Map(lockedOccurrences.map((item) => [item.dueDate, item]));
      const dueDates = listRecurringDatesNeedingSync(recurring, lockedOccurrences, { from: recurring.startDate, to: horizon, today });
      for (const dueDate of dueDates) {
        const status = getRecurringOccurrenceStatus({ mode: recurring.mode, dueDate, today });
        let occurrence = lockedByDate.get(dueDate);
        if (!occurrence) {
          // Old schedules could drift from the 31st to the 28th. Keep their recorded period intact;
          // the work list excludes any month that already has a recorded period.
          // Claim the unique due date before creating a financial movement. A conflict never leaves an orphan expense.
          const inserted = await tx.insert(recurringExpenseOccurrences).values({
            userId: recurring.userId, recurringExpenseId: recurring.id, dueDate, status: "PENDING",
          }).onConflictDoNothing().returning();
          if (!inserted.length) continue;
          occurrence = inserted[0];
          lockedByDate.set(dueDate, occurrence);
        }
        // Changing a schedule's mode must not reinterpret a period that already produced a real expense.
        if (occurrence.userId !== recurring.userId || occurrence.expenseId ||
            occurrence.status === "GENERATED" || occurrence.status === "PAID" || occurrence.status === "CANCELLED") continue;
        if (recurring.mode === "AUTOMATIC") {
          if (occurrence.expenseId) continue;
          const expense = await createRecurringExpenseRealization(tx, recurring, dueDate, dueDate);
          await tx.update(recurringExpenseOccurrences).set({ status: "GENERATED", expenseId: expense.id, paidAt: new Date(`${dueDate}T12:00:00Z`), updatedAt: new Date() }).where(eq(recurringExpenseOccurrences.id, occurrence.id));
        } else if (occurrence.status !== status) {
          await tx.update(recurringExpenseOccurrences).set({ status, updatedAt: new Date() }).where(eq(recurringExpenseOccurrences.id, occurrence.id));
        }
      }
    });
  }
}

export async function syncUserRecurringExpenseOccurrences(userId: string, referenceDate = new Date()) {
  const rows = await db.query.recurringExpenses.findMany({ where: and(eq(recurringExpenses.userId, userId), eq(recurringExpenses.active, true)) });
  await syncRows(rows, referenceDate);
}

// Internal cron entry point. Never re-export this from a `use server` action module.
export async function syncAllRecurringExpenseOccurrences(referenceDate = new Date()) {
  const rows = await db.query.recurringExpenses.findMany({ where: eq(recurringExpenses.active, true) });
  await syncRows(rows, referenceDate);
}
