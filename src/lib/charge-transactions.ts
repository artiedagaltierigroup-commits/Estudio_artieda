import "server-only";
import { and, eq } from "drizzle-orm";
import type { db } from "@/db";
import { cases, charges, clients, payments } from "@/db/schema";
import { moneyToCents } from "./charge-money";

export type ChargeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Every operation that changes a charge or its payments takes this same lock first.
export async function lockOwnedCharge(tx: ChargeTransaction, id: string, userId: string) {
  const [charge] = await tx.select().from(charges)
    .where(and(eq(charges.id, id), eq(charges.userId, userId))).for("update");
  return charge;
}

export async function hasOwnedChargeCase(tx: ChargeTransaction, caseId: string, userId: string) {
  const [parent] = await tx.select({ id: cases.id }).from(cases)
    .innerJoin(clients, and(eq(clients.id, cases.clientId), eq(clients.userId, userId)))
    .where(and(eq(cases.id, caseId), eq(cases.userId, userId))).for("key share");
  return Boolean(parent);
}

export async function chargePaidCents(tx: ChargeTransaction, chargeId: string) {
  const rows = await tx.select({ amount: payments.amount }).from(payments).where(eq(payments.chargeId, chargeId));
  return rows.reduce((total, row) => {
    const sum = total + moneyToCents(row.amount);
    if (!Number.isSafeInteger(sum)) throw new Error("El total de pagos requiere revisión");
    return sum;
  }, 0);
}
