"use server";

import { format } from "date-fns";
import { db } from "@/db";
import { listRecurringDueDates } from "@/lib/recurring-expense-occurrences";
import { createClient } from "@/lib/supabase/server";

export type CalendarEventType = "charge" | "reminder" | "expense" | "recurring";

export interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  subtitle?: string;
  amount?: number;
  color: string;
  href?: string;
}

const COLOR_MAP: Record<CalendarEventType, string> = {
  charge: "blue",
  reminder: "amber",
  expense: "red",
  recurring: "purple",
};

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const userId = await getUserId();
  const events: CalendarEvent[] = [];

  const chargeRows = await db.query.charges.findMany({
    where: (item, { and: andOperator, eq: eqOperator, gte: gteOperator, lte: lteOperator, isNull: isNullOperator }) =>
      andOperator(
        eqOperator(item.userId, userId),
        isNullOperator(item.cancelledAt),
        gteOperator(item.dueDate, from),
        lteOperator(item.dueDate, to)
      ),
    with: { case: { with: { client: true } } },
  });

  for (const charge of chargeRows) {
    if (!charge.dueDate) continue;

    events.push({
      id: `charge-${charge.id}`,
      date: charge.dueDate,
      type: "charge",
      title: charge.description,
      subtitle: charge.case?.client?.name,
      amount: parseFloat(charge.amountTotal),
      color: COLOR_MAP.charge,
      href: `/cobros/${charge.id}`,
    });
  }

  const reminderRows = await db.query.reminders.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.userId, userId), eqOperator(item.completed, false)),
  });

  for (const reminder of reminderRows) {
    const dateString = format(reminder.reminderDate, "yyyy-MM-dd");
    if (dateString < from || dateString > to) continue;

    events.push({
      id: `reminder-${reminder.id}`,
      date: dateString,
      type: "reminder",
      title: reminder.title,
      subtitle: reminder.description ?? undefined,
      color: COLOR_MAP.reminder,
      href: "/recordatorios",
    });
  }

  const expenseRows = await db.query.expenses.findMany({
    where: (item, { and: andOperator, eq: eqOperator, gte: gteOperator, lte: lteOperator, isNull: isNullOperator }) =>
      andOperator(
        eqOperator(item.userId, userId),
        isNullOperator(item.voidedAt),
        gteOperator(item.date, from),
        lteOperator(item.date, to)
      ),
  });

  for (const expense of expenseRows) {
    events.push({
      id: `expense-${expense.id}`,
      date: expense.date,
      type: "expense",
      title: expense.description,
      amount: parseFloat(expense.amount),
      color: COLOR_MAP.expense,
      href: `/gastos/${expense.id}`,
    });
  }

  const recurringRows = await db.query.recurringExpenses.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.userId, userId), eqOperator(item.active, true)),
  });

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
      { from, to }
    );

    for (const dueDate of dueDates) {
      events.push({
        id: `recurring-${recurring.id}-${dueDate}`,
        date: dueDate,
        type: "recurring",
        title: recurring.description,
        amount: parseFloat(recurring.amount),
        color: COLOR_MAP.recurring,
        href: `/gastos/recurrentes/${recurring.id}/editar`,
      });
    }
  }

  return events.sort((left, right) => left.date.localeCompare(right.date));
}
