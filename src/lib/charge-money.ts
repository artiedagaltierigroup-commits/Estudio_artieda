import { z } from "zod";

// numeric(12, 2): every valid amount fits exactly in integer cents (below 2^53).
export function moneyToCents(value: string | number): number {
  const decimal = String(value).trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(decimal)) throw new Error("Importe monetario inválido");
  const [whole, fraction = ""] = decimal.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const ChargeMoneySchema = z.string().trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Ingresá un importe válido con hasta dos decimales")
  .refine((value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(value) && moneyToCents(value) > 0, "El monto debe ser mayor a cero")
  .transform((value) => (moneyToCents(value) / 100).toFixed(2));

export const ChargeDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Ingresá una fecha válida");

export const OptionalChargeDateSchema = z.union([z.literal(""), ChargeDateSchema]).optional();
