import { deriveChargeStatus } from "./utils";

interface SearchableClient {
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
}

interface ClientPaymentInput {
  amount: number | string;
  createdAt?: string | Date | null;
}

interface ClientChargeInput {
  amountTotal: number | string;
  dueDate: string | null;
  cancelledAt?: string | Date | null;
  updatedAt?: string | Date | null;
  payments: ClientPaymentInput[];
}

interface ClientCaseInput {
  updatedAt?: string | Date | null;
  charges: ClientChargeInput[];
}

interface ClientReminderInput {
  completed: boolean;
  reminderDate: string | Date;
  updatedAt?: string | Date | null;
}

interface ClientFinanceInput {
  clientUpdatedAt?: string | Date | null;
  cases: ClientCaseInput[];
  reminders: ClientReminderInput[];
}

export type ClientPortfolioStatus = "OVERDUE" | "ACTIVE" | "FOLLOW_UP" | "IDLE";

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function toIsoString(value?: string | Date | null) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function filterClientsByQuery<T extends SearchableClient>(clients: T[], query?: string | null) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return clients;

  return clients.filter((client) =>
    [client.name, client.email, client.phone, client.taxId].some((field) => normalize(field).includes(normalizedQuery))
  );
}

export function summarizeClientFinance(input: ClientFinanceInput) {
  const summary = {
    expected: 0,
    collected: 0,
    balance: 0,
    overdue: 0,
    partial: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    upcomingCharges: 0,
    openReminders: 0,
    lastMovementAt: toIsoString(input.clientUpdatedAt),
  };

  const today = new Date();

  for (const currentCase of input.cases) {
    const caseUpdatedAt = toIsoString(currentCase.updatedAt);
    if (caseUpdatedAt && (!summary.lastMovementAt || caseUpdatedAt > summary.lastMovementAt)) {
      summary.lastMovementAt = caseUpdatedAt;
    }

    for (const charge of currentCase.charges) {
      const total = Number(charge.amountTotal);
      const paid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = Math.max(0, total - paid);
      const status = deriveChargeStatus(String(charge.amountTotal), paid.toFixed(2), charge.dueDate, charge.cancelledAt);
      const chargeUpdatedAt = toIsoString(charge.updatedAt);

      if (chargeUpdatedAt && (!summary.lastMovementAt || chargeUpdatedAt > summary.lastMovementAt)) {
        summary.lastMovementAt = chargeUpdatedAt;
      }

      for (const payment of charge.payments) {
        const paymentCreatedAt = toIsoString(payment.createdAt);
        if (paymentCreatedAt && (!summary.lastMovementAt || paymentCreatedAt > summary.lastMovementAt)) {
          summary.lastMovementAt = paymentCreatedAt;
        }
      }

      if (status === "CANCELLED") {
        summary.cancelled += 1;
        continue;
      }

      summary.expected += total;
      summary.collected += paid;
      summary.balance += balance;

      if (status === "OVERDUE") summary.overdue += 1;
      else if (status === "PARTIAL") summary.partial += 1;
      else if (status === "PAID") summary.paid += 1;
      else summary.pending += 1;

      if (charge.dueDate && new Date(charge.dueDate) >= today && status !== "PAID") {
        summary.upcomingCharges += 1;
      }
    }
  }

  for (const reminder of input.reminders) {
    const reminderUpdatedAt = toIsoString(reminder.updatedAt);
    if (reminderUpdatedAt && (!summary.lastMovementAt || reminderUpdatedAt > summary.lastMovementAt)) {
      summary.lastMovementAt = reminderUpdatedAt;
    }

    if (!reminder.completed) {
      summary.openReminders += 1;
    }
  }

  return summary;
}

export function getClientPortfolioStatus(input: {
  activeCases: number;
  overdueCharges: number;
  openReminders: number;
}): ClientPortfolioStatus {
  if (input.overdueCharges > 0) return "OVERDUE";
  if (input.activeCases > 0) return "ACTIVE";
  if (input.openReminders > 0) return "FOLLOW_UP";
  return "IDLE";
}
