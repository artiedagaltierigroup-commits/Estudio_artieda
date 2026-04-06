import { formatCurrency } from "./utils";

export const MONEY_MASK = "***";
export const MONEY_VISIBILITY_STORAGE_KEY = "estudio-artieda-money-hidden";

export function formatDisplayCurrency(value: number | string | null | undefined, hidden: boolean): string {
  if (hidden) return MONEY_MASK;
  return formatCurrency(value);
}

export function getInitialMoneyHidden(savedValue: string | null | undefined): boolean {
  return savedValue === "true";
}
