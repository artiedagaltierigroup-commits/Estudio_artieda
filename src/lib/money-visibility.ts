import { formatCurrency } from "./utils";

export const MONEY_MASK = "***";

export function formatDisplayCurrency(value: number | string | null | undefined, hidden: boolean): string {
  if (hidden) return MONEY_MASK;
  return formatCurrency(value);
}
