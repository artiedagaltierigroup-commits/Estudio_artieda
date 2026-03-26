import { deriveChargeStatus } from "./utils";

interface CasePaymentInput {
  amount: string | number;
}

interface CaseChargeInput {
  amountTotal: string | number;
  dueDate: string | null;
  cancelledAt?: string | Date | null;
  payments: CasePaymentInput[];
}

interface FilterableCase {
  title: string;
  status: string;
  client?: {
    name?: string | null;
  } | null;
  financeSummary: {
    dominantStatus: string;
  };
  latestDueDate?: string | null;
}

interface CaseFilters {
  query?: string;
  status?: string;
  chargeStatus?: string;
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function summarizeCaseFinance(charges: CaseChargeInput[]) {
  const summary = {
    expected: 0,
    collected: 0,
    balance: 0,
    overdue: 0,
    partial: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    openCharges: 0,
    nextDueDate: null as string | null,
    dominantStatus: "PENDING" as "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED",
  };

  for (const charge of charges) {
    const total = Number(charge.amountTotal);
    const paid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balance = Math.max(0, total - paid);
    const status = deriveChargeStatus(String(charge.amountTotal), paid.toFixed(2), charge.dueDate, charge.cancelledAt);

    if (status === "CANCELLED") {
      summary.cancelled += 1;
    } else {
      summary.expected += total;
      summary.collected += paid;
      summary.balance += balance;
      summary.openCharges += status === "PAID" ? 0 : 1;

      if (status === "OVERDUE") summary.overdue += 1;
      else if (status === "PARTIAL") summary.partial += 1;
      else if (status === "PAID") summary.paid += 1;
      else summary.pending += 1;

      if (charge.dueDate && (!summary.nextDueDate || charge.dueDate < summary.nextDueDate)) {
        summary.nextDueDate = charge.dueDate;
      }
    }
  }

  if (summary.overdue > 0) summary.dominantStatus = "OVERDUE";
  else if (summary.partial > 0) summary.dominantStatus = "PARTIAL";
  else if (summary.pending > 0) summary.dominantStatus = "PENDING";
  else if (summary.paid > 0) summary.dominantStatus = "PAID";
  else summary.dominantStatus = "CANCELLED";

  return summary;
}

export function getCasePendingBalance(
  fee: string | number | null | undefined,
  collected: number,
  summaryBalance: number
) {
  if (fee !== null && fee !== undefined && String(fee).trim() !== "") {
    return Math.max(0, Number(fee) - collected);
  }

  return Math.max(0, summaryBalance);
}

export function filterCasesByFilters<T extends FilterableCase>(items: T[], filters: CaseFilters) {
  const query = normalize(filters.query);

  return items.filter((item) => {
    const matchesQuery =
      !query ||
      normalize(item.title).includes(query) ||
      normalize(item.client?.name ?? "").includes(query);
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesChargeStatus = !filters.chargeStatus || item.financeSummary.dominantStatus === filters.chargeStatus;

    return matchesQuery && matchesStatus && matchesChargeStatus;
  });
}
