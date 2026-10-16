import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { addDays, endOfMonth, format, parseISO } from "date-fns";
import { db } from "@/db";
import { expenses, recurringExpenseOccurrences, recurringExpenses } from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { getBusinessDate } from "@/lib/business-date";
import { getRecurringOccurrenceStatus, listRecurringDueDates } from "@/lib/recurring-expense-occurrences";

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
  const today = getBusinessDate(referenceDate);
  const horizon = format(endOfMonth(addDays(parseISO(today), 15)), "yyyy-MM-dd");
  for (const candidate of rows) {
    await db.transaction(async (tx) => {
      // Re-read after acquiring the lock: stale snapshots must not recreate or duplicate a payment.
      const [recurring] = await tx.select().from(recurringExpenses)
        .where(and(eq(recurringExpenses.id, candidate.id), eq(recurringExpenses.userId, candidate.userId))).for("update");
      if (!recurring?.active) return;
      const dueDates = listRecurringDueDates(recurring, { from: recurring.startDate, to: horizon });
      for (const dueDate of dueDates) {
        const status = getRecurringOccurrenceStatus({ mode: recurring.mode, dueDate, today });
        if (recurring.mode === "AUTOMATIC" && status !== "GENERATED") continue;
        let [occurrence] = await tx.select().from(recurringExpenseOccurrences)
          .where(and(eq(recurringExpenseOccurrences.recurringExpenseId, recurring.id), eq(recurringExpenseOccurrences.dueDate, dueDate))).for("update");
        if (!occurrence) {
          // Old schedules could drift from the 31st to the 28th. Keep their recorded period intact;
          // adopting the corrected anchor must not create a second expense for that historical month.
          const existingPeriod = await tx.query.recurringExpenseOccurrences.findFirst({ where: and(
            eq(recurringExpenseOccurrences.recurringExpenseId, recurring.id),
            gte(recurringExpenseOccurrences.dueDate, `${dueDate.slice(0, 7)}-01`),
            lte(recurringExpenseOccurrences.dueDate, format(endOfMonth(parseISO(dueDate)), "yyyy-MM-dd")),
          ) });
          if (existingPeriod) continue;
          // Claim the unique due date before creating a financial movement. A conflict never leaves an orphan expense.
          const inserted = await tx.insert(recurringExpenseOccurrences).values({
            userId: recurring.userId, recurringExpenseId: recurring.id, dueDate, status: "PENDING",
          }).onConflictDoNothing().returning();
          if (!inserted.length) continue;
          occurrence = inserted[0];
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
