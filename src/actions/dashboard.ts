"use server";

import { and, sql } from "drizzle-orm";
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { db } from "@/db";
import { clients, cases, expenses, payments, reminders } from "@/db/schema";
import {
  buildChargeStatusBreakdown,
  buildExpensesByCategory,
  buildMonthlyNetSeries,
  buildTopClients,
  pickUpcomingCharges,
  pickUrgentReminders,
} from "@/lib/analytics-insights";
import { summarizeChargeRecord } from "@/lib/charge-insights";
import {
  buildStatisticsTrendSeries,
  buildTopCasesByCollected,
  getComparisonDelta,
  getPreviousEquivalentRange,
} from "@/lib/statistics-insights";
import { createClient } from "@/lib/supabase/server";
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
  activeCases: number;
  overdueCharges: number;
  openReminders: number;
  topClient: { name: string; total: number } | null;
  topMonth: { month: string; total: number } | null;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  upcomingCharges: Array<{
    id: string;
    description: string;
    dueDate: string | null;
    balance: number;
    derivedStatus: string;
    clientName: string;
    caseTitle: string;
  }>;
  debtClients: Array<{
    clientId: string;
    clientName: string;
    collected: number;
    balance: number;
  }>;
  urgentReminders: Array<{
    id: string;
    title: string;
    reminderDate: Date;
    priority: "LOW" | "MEDIUM" | "HIGH";
    clientName: string | null;
    caseTitle: string | null;
  }>;
}

export interface AnalyticsSnapshot {
  monthlyIncome: Array<{ month: string; total: number }>;
  monthlyNet: Array<{ month: string; income: number; expenses: number; net: number }>;
  expensesByType: Array<{ name: string; value: number }>;
  chargesByStatus: Array<{ name: string; value: number; color: string }>;
  topClients: Array<{ clientId: string; clientName: string; collected: number; balance: number }>;
}

export interface StatisticsFilters {
  from: string;
  to: string;
  clientId?: string;
  caseId?: string;
}

export interface StatisticsFilterOptions {
  clients: Array<{ id: string; name: string }>;
  cases: Array<{ id: string; title: string; clientId: string; clientName: string }>;
}

interface StatisticsMetricComparison {
  current: number;
  previous: number;
  amount: number;
  percentage: number;
  direction: "up" | "down" | "flat";
}

export interface StatisticsSnapshot {
  ranges: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
  metrics: {
    collectedIncome: StatisticsMetricComparison;
    pendingIncome: StatisticsMetricComparison;
    periodExpenses: StatisticsMetricComparison;
    netResult: StatisticsMetricComparison;
  };
  comparisonBars: Array<{ label: string; current: number; previous: number }>;
  trendSeries: Array<{ label: string; grossIncome: number; expenses: number }>;
  movementSeries: Array<{ label: string; collected: number; expenses: number }>;
  expensesByCategory: Array<{ name: string; value: number; percentage: number }>;
  topClients: Array<{ clientId: string; clientName: string; collected: number; balance: number }>;
  topCases: Array<{ caseId: string; caseTitle: string; clientName: string; collected: number }>;
}

async function getBaseData(userId: string) {
  const [chargeRows, paymentRows, expenseRows, reminderRows, caseRows] = await Promise.all([
    db.query.charges.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      with: {
        payments: true,
        case: { with: { client: true } },
      },
      orderBy: (item, { desc }) => [desc(item.updatedAt)],
    }),
    db.query.payments.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { desc }) => [desc(item.paymentDate)],
    }),
    db.query.expenses.findMany({
      where: (item, { and: andOperator, eq: eqOperator }) =>
        andOperator(eqOperator(item.userId, userId), sql`${item.voidedAt} is null`),
      orderBy: (item, { desc }) => [desc(item.date)],
    }),
    db.query.reminders.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      with: {
        client: true,
        case: true,
      },
      orderBy: (item, { asc }) => [asc(item.reminderDate)],
    }),
    db.query.cases.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      with: { client: true },
    }),
  ]);

  const charges = chargeRows.map((charge) => {
    const summary = summarizeChargeRecord(charge);
    return {
      ...charge,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      derivedStatus: summary.derivedStatus,
      clientName: charge.case?.client?.name ?? "Sin cliente",
      caseTitle: charge.case?.title ?? "Sin caso",
    };
  });

  return { charges, paymentRows, expenseRows, reminderRows, caseRows };
}

function getChargeStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "#D4A15B";
    case "PARTIAL":
      return "#C9B6E4";
    case "PAID":
      return "#7BBE9E";
    case "OVERDUE":
      return "#D96C6C";
    case "CANCELLED":
      return "#8A7C84";
    default:
      return "#8A7C84";
  }
}

function getChargeStatusName(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "PARTIAL":
      return "Parcial";
    case "PAID":
      return "Pagado";
    case "OVERDUE":
      return "Vencido";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function getChargeDateInRange(dateStr: string | null | undefined, from: string, to: string) {
  return Boolean(dateStr && dateStr >= from && dateStr <= to);
}

function buildPeriodMetric(current: number, previous: number): StatisticsMetricComparison {
  const delta = getComparisonDelta(current, previous);

  return {
    current,
    previous,
    amount: delta.amount,
    percentage: delta.percentage,
    direction: delta.direction,
  };
}

function buildMovementSeries(
  from: string,
  to: string,
  trendSeries: Array<{ label: string; grossIncome: number; expenses: number }>
) {
  const totalDays = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const visibleRows = totalDays <= 31 ? trendSeries.filter((item) => item.grossIncome > 0 || item.expenses > 0) : trendSeries;

  return visibleRows.map((item) => ({
    label: item.label,
    collected: item.grossIncome,
    expenses: item.expenses,
  }));
}

export async function getDashboardOverview(filters: DashboardFilters): Promise<DashboardOverview> {
  const userId = await getUserId();
  const { from, to, clientId, chargeStatus } = filters;
  const { charges, paymentRows, expenseRows, reminderRows, caseRows } = await getBaseData(userId);

  const filteredCharges = charges
    .filter((charge) => (clientId ? charge.case?.clientId === clientId : true))
    .filter((charge) => (chargeStatus ? charge.derivedStatus === chargeStatus : true));

  const periodCharges = filteredCharges.filter(
    (charge) => charge.derivedStatus !== "CANCELLED" && charge.dueDate && charge.dueDate >= from && charge.dueDate <= to
  );
  const expectedIncome = periodCharges.reduce((sum, charge) => sum + Number(charge.amountTotal), 0);

  const collectedIncome = paymentRows
    .filter((payment) => payment.paymentDate >= from && payment.paymentDate <= to)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const periodExpenses = expenseRows
    .filter((expense) => expense.date >= from && expense.date <= to)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const projectedRecurring = await getMonthlyProjection(new Date(from));
  const pendingIncome = Math.max(0, expectedIncome - collectedIncome);
  const netResult = collectedIncome - (periodExpenses + projectedRecurring);
  const grossIncome = paymentRows.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const netIncome = grossIncome - expenseRows.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const topClients = buildTopClients(
    charges
      .filter((charge) => charge.case?.clientId)
      .map((charge) => ({
        clientId: charge.case!.clientId,
        clientName: charge.clientName,
        collected: charge.amountPaid,
        balance: charge.balance,
      }))
  );

  const monthlyIncomeRows = Array.from(
    paymentRows.reduce((map, payment) => {
      const month = format(new Date(payment.paymentDate), "yyyy-MM");
      map.set(month, (map.get(month) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>())
  )
    .map(([month, total]) => ({ month, total }))
    .sort((left, right) => left.month.localeCompare(right.month));

  const topMonth = monthlyIncomeRows.length
    ? monthlyIncomeRows.reduce((best, current) => (current.total > best.total ? current : best))
    : null;

  return {
    metrics: {
      expectedIncome,
      collectedIncome,
      pendingIncome,
      periodExpenses,
      projectedRecurring,
      netResult,
      grossIncome,
      netIncome,
      activeCases: caseRows.filter((item) => item.status === "ACTIVE").length,
      overdueCharges: charges.filter((item) => item.derivedStatus === "OVERDUE").length,
      openReminders: reminderRows.filter((item) => !item.completed).length,
      topClient: topClients[0] ? { name: topClients[0].clientName, total: topClients[0].collected } : null,
      topMonth: topMonth ? { month: topMonth.month, total: topMonth.total } : null,
    },
    upcomingCharges: pickUpcomingCharges(charges)
      .slice(0, 6)
      .map((charge) => ({
        id: charge.id,
        description: charge.description,
        dueDate: charge.dueDate,
        balance: charge.balance,
        derivedStatus: charge.derivedStatus,
        clientName: charge.clientName,
        caseTitle: charge.caseTitle,
      })),
    debtClients: topClients.filter((item) => item.balance > 0).sort((left, right) => right.balance - left.balance).slice(0, 6),
    urgentReminders: pickUrgentReminders(reminderRows)
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        title: item.title,
        reminderDate: item.reminderDate,
        priority: item.priority,
        clientName: item.client?.name ?? item.case?.title ?? null,
        caseTitle: item.case?.title ?? null,
      })),
  };
}

export async function getDashboardMetrics(filters: DashboardFilters): Promise<DashboardMetrics> {
  const overview = await getDashboardOverview(filters);
  return overview.metrics;
}

export async function getStatisticsFilterOptions(): Promise<StatisticsFilterOptions> {
  const userId = await getUserId();

  const [clientRows, caseRows] = await Promise.all([
    db.query.clients.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { asc }) => [asc(item.name)],
    }),
    db.query.cases.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      with: { client: true },
      orderBy: (item, { asc }) => [asc(item.title)],
    }),
  ]);

  return {
    clients: clientRows.map((item) => ({ id: item.id, name: item.name })),
    cases: caseRows.map((item) => ({
      id: item.id,
      title: item.title,
      clientId: item.clientId,
      clientName: item.client?.name ?? "Sin cliente",
    })),
  };
}

export async function getStatisticsSnapshot(filters: StatisticsFilters): Promise<StatisticsSnapshot> {
  const userId = await getUserId();
  const { charges, expenseRows } = await getBaseData(userId);
  const { from, to, clientId, caseId } = filters;
  const previousRange = getPreviousEquivalentRange({ from, to });

  const filteredCharges = charges
    .filter((charge) => (clientId ? charge.case?.clientId === clientId : true))
    .filter((charge) => (caseId ? charge.caseId === caseId : true));

  const buildRelevantCharges = (rangeFrom: string, rangeTo: string) =>
    filteredCharges.filter((charge) => {
      const createdDate = format(new Date(charge.createdAt), "yyyy-MM-dd");
      const hasPaymentInRange = charge.payments.some((payment) =>
        getChargeDateInRange(payment.paymentDate, rangeFrom, rangeTo)
      );

      return (
        getChargeDateInRange(charge.dueDate, rangeFrom, rangeTo) ||
        getChargeDateInRange(createdDate, rangeFrom, rangeTo) ||
        hasPaymentInRange
      );
    });

  const buildPeriodPayments = (items: typeof filteredCharges, rangeFrom: string, rangeTo: string) =>
    items.flatMap((charge) =>
      charge.payments
        .filter((payment) => getChargeDateInRange(payment.paymentDate, rangeFrom, rangeTo))
        .map((payment) => ({
          paymentDate: payment.paymentDate,
          amount: Number(payment.amount),
          clientId: charge.case?.clientId ?? null,
          clientName: charge.clientName,
          caseId: charge.caseId,
          caseTitle: charge.caseTitle,
        }))
    );

  const currentCharges = buildRelevantCharges(from, to);
  const previousCharges = buildRelevantCharges(previousRange.from, previousRange.to);
  const currentPayments = buildPeriodPayments(currentCharges, from, to);
  const previousPayments = buildPeriodPayments(previousCharges, previousRange.from, previousRange.to);

  const currentExpenses = expenseRows
    .filter((expense) => expense.date >= from && expense.date <= to)
    .map((expense) => ({
      ...expense,
      normalizedAmount: Number(expense.amount),
    }));
  const previousExpenses = expenseRows
    .filter((expense) => expense.date >= previousRange.from && expense.date <= previousRange.to)
    .map((expense) => ({
      ...expense,
      normalizedAmount: Number(expense.amount),
    }));

  const collectedIncome = currentPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const previousCollectedIncome = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingIncome = currentCharges
    .filter((charge) => charge.derivedStatus !== "CANCELLED")
    .reduce((sum, charge) => sum + charge.balance, 0);
  const previousPendingIncome = previousCharges
    .filter((charge) => charge.derivedStatus !== "CANCELLED")
    .reduce((sum, charge) => sum + charge.balance, 0);
  const periodExpenses = currentExpenses.reduce((sum, expense) => sum + expense.normalizedAmount, 0);
  const previousPeriodExpenses = previousExpenses.reduce((sum, expense) => sum + expense.normalizedAmount, 0);
  const netResult = collectedIncome - periodExpenses;
  const previousNetResult = previousCollectedIncome - previousPeriodExpenses;

  const topClients = buildTopClients(
    currentPayments
      .filter((payment) => payment.clientId)
      .map((payment) => ({
        clientId: payment.clientId!,
        clientName: payment.clientName,
        collected: payment.amount,
        balance: 0,
      }))
  )
    .filter((item) => item.collected > 0)
    .slice(0, 6);
  const topCases = buildTopCasesByCollected(
    currentPayments.map((payment) => ({
      caseId: payment.caseId,
      caseTitle: payment.caseTitle,
      clientName: payment.clientName,
      collected: payment.amount,
    }))
  )
    .filter((item) => item.collected > 0)
    .slice(0, 6);
  const trendSeries = buildStatisticsTrendSeries({
    from,
    to,
    payments: currentPayments.map((payment) => ({
      paymentDate: payment.paymentDate,
      amount: payment.amount,
    })),
    expenses: currentExpenses.map((expense) => ({
      date: expense.date,
      amount: expense.normalizedAmount,
    })),
  });

  return {
    ranges: {
      current: { from, to },
      previous: previousRange,
    },
    metrics: {
      collectedIncome: buildPeriodMetric(collectedIncome, previousCollectedIncome),
      pendingIncome: buildPeriodMetric(pendingIncome, previousPendingIncome),
      periodExpenses: buildPeriodMetric(periodExpenses, previousPeriodExpenses),
      netResult: buildPeriodMetric(netResult, previousNetResult),
    },
    comparisonBars: [
      { label: "Cobrado", current: collectedIncome, previous: previousCollectedIncome },
      { label: "Gastos", current: periodExpenses, previous: previousPeriodExpenses },
      { label: "Neto", current: netResult, previous: previousNetResult },
    ],
    trendSeries,
    movementSeries: buildMovementSeries(from, to, trendSeries),
    expensesByCategory: buildExpensesByCategory(
      currentExpenses.map((expense) => ({
        category: expense.category,
        amount: expense.normalizedAmount,
      })),
      6
    ),
    topClients,
    topCases,
  };
}

export async function getAnalyticsSnapshot(monthsBack = 12): Promise<AnalyticsSnapshot> {
  const userId = await getUserId();
  const { charges, paymentRows, expenseRows } = await getBaseData(userId);

  const monthlyIncome = [];
  const monthlyExpenseRows = [];

  for (let index = monthsBack - 1; index >= 0; index -= 1) {
    const date = subMonths(new Date(), index);
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    const end = format(endOfMonth(date), "yyyy-MM-dd");
    const income = paymentRows
      .filter((payment) => payment.paymentDate >= start && payment.paymentDate <= end)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const expensesTotal = expenseRows
      .filter((expense) => expense.date >= start && expense.date <= end)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    monthlyIncome.push({ month: format(date, "MMM yy"), total: income });
    monthlyExpenseRows.push({ month: format(date, "MMM yy"), total: expensesTotal });
  }

  const statusBreakdown = buildChargeStatusBreakdown(charges.map((charge) => charge.derivedStatus));
  const topClients = buildTopClients(
    charges
      .filter((charge) => charge.case?.clientId)
      .map((charge) => ({
        clientId: charge.case!.clientId,
        clientName: charge.clientName,
        collected: charge.amountPaid,
        balance: charge.balance,
      }))
  );

  return {
    monthlyIncome,
    monthlyNet: buildMonthlyNetSeries(monthlyIncome, monthlyExpenseRows),
    expensesByType: [
      { name: "Operativo", value: expenseRows.filter((item) => item.type === "OPERATIVE").reduce((sum, item) => sum + Number(item.amount), 0) },
      { name: "Impuesto", value: expenseRows.filter((item) => item.type === "TAX").reduce((sum, item) => sum + Number(item.amount), 0) },
      { name: "Servicio", value: expenseRows.filter((item) => item.type === "SERVICE").reduce((sum, item) => sum + Number(item.amount), 0) },
      { name: "Otro", value: expenseRows.filter((item) => item.type === "OTHER").reduce((sum, item) => sum + Number(item.amount), 0) },
    ],
    chargesByStatus: [
      { name: "Pendiente", value: statusBreakdown.PENDING, color: "#D4A15B" },
      { name: "Parcial", value: statusBreakdown.PARTIAL, color: "#C9B6E4" },
      { name: "Pagado", value: statusBreakdown.PAID, color: "#7BBE9E" },
      { name: "Vencido", value: statusBreakdown.OVERDUE, color: "#D96C6C" },
      { name: "Cancelado", value: statusBreakdown.CANCELLED, color: "#8A7C84" },
    ],
    topClients: topClients.slice(0, 6),
  };
}

export async function getMonthlyIncomeChart(monthsBack = 12) {
  const snapshot = await getAnalyticsSnapshot(monthsBack);
  return snapshot.monthlyIncome;
}
