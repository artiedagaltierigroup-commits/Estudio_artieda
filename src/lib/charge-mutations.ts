export function buildInitialChargePayment(input: {
  markAsPaid?: boolean;
  amountTotal: string;
}) {
  if (!input.markAsPaid) return null;

  return {
    amount: input.amountTotal,
    paymentDate: new Date().toISOString().slice(0, 10),
  };
}
