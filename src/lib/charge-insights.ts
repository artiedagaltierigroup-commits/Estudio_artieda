import { deriveChargeStatus } from "./utils";

interface ChargePaymentInput {
  amount: string | number;
}

interface ChargeSummaryInput {
  amountTotal: string | number;
  dueDate: string | null;
  cancelledAt?: string | Date | null;
  payments: ChargePaymentInput[];
}

interface FilterableCharge {
  description: string;
  case?: {
    title?: string | null;
    client?: {
      name?: string | null;
    } | null;
  } | null;
  derivedStatus: string;
}

interface SortableCharge {
  dueDate: string | null;
  updatedAt?: string | Date | null;
}

interface ChargeFilters {
  query?: string;
  status?: string;
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function summarizeChargeRecord(charge: ChargeSummaryInput) {
  const amountPaid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = Math.max(0, Number(charge.amountTotal) - amountPaid);
  const derivedStatus = deriveChargeStatus(
    String(charge.amountTotal),
    amountPaid.toFixed(2),
    charge.dueDate,
    charge.cancelledAt
  );

  return {
    amountPaid,
    balance,
    derivedStatus,
  };
}

export function filterChargesByFilters<T extends FilterableCharge>(items: T[], filters: ChargeFilters) {
  const query = normalize(filters.query);

  return items.filter((item) => {
    const matchesQuery =
      !query ||
      normalize(item.description).includes(query) ||
      normalize(item.case?.title ?? "").includes(query) ||
      normalize(item.case?.client?.name ?? "").includes(query);
    const matchesStatus = !filters.status || item.derivedStatus === filters.status;

    return matchesQuery && matchesStatus;
  });
}

export function sortChargesByDueDate<T extends SortableCharge>(items: T[]) {
  return [...items].sort((left, right) => {
    if (!left.dueDate && !right.dueDate) return compareUpdatedAtDesc(left.updatedAt, right.updatedAt);
    if (!left.dueDate) return 1;
    if (!right.dueDate) return -1;

    const dueDateComparison = left.dueDate.localeCompare(right.dueDate);
    if (dueDateComparison !== 0) return dueDateComparison;

    return compareUpdatedAtDesc(left.updatedAt, right.updatedAt);
  });
}

function compareUpdatedAtDesc(left?: string | Date | null, right?: string | Date | null) {
  return toTimestamp(right) - toTimestamp(left);
}

function toTimestamp(value?: string | Date | null) {
  return value ? new Date(value).getTime() : 0;
}
