"use server";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { db } from "@/db";
import { cases, charges, expenses, payments } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { deriveChargeStatus } from "@/lib/utils";
import { getMonthlyProjection } from "./recurring-expenses";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export interface DashboardFilters {
  from: string;
  to: string;
  clientId?: string;
  chargeStatus?: string;
}

export interface DashboardMetrics {
  expectedIncome: number;
  collectedIncome: number;
  pendingIncome: number;
  periodExpenses: number;
  projectedRecurring: number;
  netResult: number;
  grossIncome: number;
  netIncome: number;
  topClient: { name: string; total: number } | null;
  topMonth: { month: string; total: number } | null;
}

export async function getDashboardMetrics(filters: DashboardFilters): Promise<DashboardMetrics> {
  const userId = await getUserId();
  const { from, to, clientId, chargeStatus } = filters;

  const periodChargesRaw = await db.query.charges.findMany({
    where: (item, { and: andOperator, eq: eqOperator, gte: gteOperator, lte: lteOperator }) =>
      andOperator(
        eqOperator(item.userId, userId),
        gteOperator(item.dueDate, from),
        lteOperator(item.dueDate, to)
      ),
    with: {
      payments: true,
      case: true,
    },
  });

  const periodCharges = periodChargesRaw
    .map((charge) => {
      const amountPaid = charge.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const derivedStatus = deriveChargeStatus(
        charge.amountTotal,
        amountPaid.toFixed(2),
        charge.dueDate,
        charge.cancelledAt
      );

      return {
        ...charge,
        amountPaid,
        derivedStatus,
      };
    })
    .filter((charge) => charge.derivedStatus !== "CANCELLED")
    .filter((charge) => (clientId ? charge.case?.clientId === clientId : true))
    .filter((charge) => (chargeStatus ? charge.derivedStatus === chargeStatus : true));

  const expectedIncome = periodCharges.reduce((sum, charge) => sum + parseFloat(charge.amountTotal), 0);
  const periodChargeIds = periodCharges.map((charge) => charge.id);

  let collectedIncome = 0;
  if (periodChargeIds.length > 0) {
    const periodPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(and(eq(payments.userId, userId), gte(payments.paymentDate, from), lte(payments.paymentDate, to)));

    collectedIncome = periodPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  }

  const pendingIncome = Math.max(0, expectedIncome - collectedIncome);

  const periodExpensesRows = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, from),
        lte(expenses.date, to),
        sql`${expenses.voidedAt} is null`
      )
    );
  const periodExpenses = periodExpensesRows.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  const projectedRecurring = await getMonthlyProjection(new Date(from));
  const netResult = collectedIncome - (periodExpenses + projectedRecurring);

  const allPayments = await db.select({ amount: payments.amount }).from(payments).where(eq(payments.userId, userId));
  const grossIncome = allPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  const allExpenses = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), sql`${expenses.voidedAt} is null`));
  const totalExpenses = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const netIncome = grossIncome - totalExpenses;

  const clientTotals = await db
    .select({
      clientId: cases.clientId,
      total: sql<number>`SUM(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(charges, eq(payments.chargeId, charges.id))
    .innerJoin(cases, eq(charges.caseId, cases.id))
    .where(eq(payments.userId, userId))
    .groupBy(cases.clientId)
    .orderBy(sql`SUM(${payments.amount}) DESC`)
    .limit(1);

  let topClient: DashboardMetrics["topClient"] = null;
  if (clientTotals.length > 0) {
    const topClientData = await db.query.clients.findFirst({
      where: (item, { eq: eqOperator }) => eqOperator(item.id, clientTotals[0].clientId),
    });

    if (topClientData) {
      topClient = { name: topClientData.name, total: clientTotals[0].total };
    }
  }

  const monthlyRows = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.paymentDate}::date, 'YYYY-MM')`,
      total: sql<number>`SUM(${payments.amount})`,
    })
    .from(payments)
    .where(eq(payments.userId, userId))
    .groupBy(sql`TO_CHAR(${payments.paymentDate}::date, 'YYYY-MM')`)
    .orderBy(sql`SUM(${payments.amount}) DESC`)
    .limit(1);

  const topMonth = monthlyRows.length > 0 ? { month: monthlyRows[0].month, total: monthlyRows[0].total } : null;

  return {
    expectedIncome,
    collectedIncome,
    pendingIncome,
    periodExpenses,
    projectedRecurring,
    netResult,
    grossIncome,
    netIncome,
    topClient,
    topMonth,
  };
}

export async function getMonthlyIncomeChart(monthsBack = 12) {
  const userId = await getUserId();
  const result = [];

  for (let index = monthsBack - 1; index >= 0; index -= 1) {
    const date = subMonths(new Date(), index);
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    const end = format(endOfMonth(date), "yyyy-MM-dd");
    const rows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(and(eq(payments.userId, userId), gte(payments.paymentDate, start), lte(payments.paymentDate, end)));

    const total = rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    result.push({ month: format(date, "MMM yy"), total });
  }

  return result;
}
