import { deriveChargeStatus } from "./utils";

interface ClientCaseSummaryInput {
  status: string;
}

interface ChargePaymentSummaryInput {
  amount: number | string;
}

interface CaseChargeSummaryInput {
  amountTotal: number | string;
  dueDate: string | null;
  cancelledAt?: string | Date | null;
  payments: ChargePaymentSummaryInput[];
}

export function summarizeClientCases(items: ClientCaseSummaryInput[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;

      if (item.status === "ACTIVE") acc.active += 1;
      else if (item.status === "SUSPENDED") acc.suspended += 1;
      else if (item.status === "CLOSED") acc.closed += 1;

      return acc;
    },
    {
      total: 0,
      active: 0,
      suspended: 0,
      closed: 0,
    }
  );
}

export function summarizeCaseCharges(items: CaseChargeSummaryInput[]) {
  return items.reduce(
    (acc, item) => {
      const total = Number(item.amountTotal);
      const paid = item.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = total - paid;
      const status = deriveChargeStatus(String(item.amountTotal), paid.toFixed(2), item.dueDate, item.cancelledAt);

      acc.total += 1;
      if (status === "CANCELLED") {
        return acc;
      }

      acc.expected += total;
      acc.collected += paid;
      acc.balance += balance;

      if (status === "OVERDUE") acc.overdue += 1;
      else if (status === "PARTIAL") acc.partial += 1;
      else if (status === "PAID") acc.paid += 1;
      else if (status === "PENDING") acc.pending += 1;

      return acc;
    },
    {
      total: 0,
      expected: 0,
      collected: 0,
      balance: 0,
      overdue: 0,
      partial: 0,
      paid: 0,
      pending: 0,
    }
  );
}
