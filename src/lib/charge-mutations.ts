import { getBusinessDate } from "./business-date";

export function buildInitialChargePayment(input: {
  markAsPaid?: boolean;
  amountTotal: string;
}) {
  if (!input.markAsPaid) return null;

  return {
    amount: input.amountTotal,
    paymentDate: getBusinessDate(),
  };
}
