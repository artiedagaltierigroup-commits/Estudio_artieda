"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, payments } from "@/db/schema";
import { ChargeDateSchema, ChargeMoneySchema, moneyToCents } from "@/lib/charge-money";
import { chargePaidCents, lockOwnedCharge } from "@/lib/charge-transactions";
import { requireAdminAccess } from "@/lib/workspace-access";
import { logActivity } from "@/lib/activity-log";

const PaymentSchema = z.object({
  paymentId: z.string().uuid("Actualizá la página antes de registrar el pago"),
  chargeId: z.string().uuid(),
  amount: ChargeMoneySchema,
  paymentDate: ChargeDateSchema,
  method: z.string().optional(),
  notes: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  return value?.trim() || null;
}

async function getUserId(): Promise<string> {
  return (await requireAdminAccess()).ownerUserId;
}

export async function createPayment(formData: FormData) {
  const userId = await getUserId();
  const parsed = PaymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { paymentId, ...data } = parsed.data;
  const values = { ...data, userId, method: normalizeOptionalText(data.method), notes: normalizeOptionalText(data.notes) };

  const result = await db.transaction(async (tx) => {
    const charge = await lockOwnedCharge(tx, data.chargeId, userId);
    if (!charge) return { error: "Cobro no encontrado" };
    const existing = await tx.query.payments.findFirst({ where: eq(payments.id, paymentId) });
    if (existing) {
      const same = existing.userId === userId && existing.chargeId === data.chargeId &&
        existing.amount === data.amount && existing.paymentDate === data.paymentDate &&
        existing.method === values.method && existing.notes === values.notes;
      return same ? { caseId: charge.caseId } : { error: "Este intento de pago ya fue utilizado. Actualizá la página" };
    }
    const removed = await tx.query.activityLog.findFirst({
      where: and(eq(activityLog.entityType, "payment"), eq(activityLog.entityId, paymentId), eq(activityLog.action, "deleted")),
      columns: { id: true },
    });
    if (removed) return { error: "Este pago fue eliminado. Actualizá la página antes de registrar otro" };
    if (charge.cancelledAt) return { error: "No se pueden registrar pagos en un cobro cancelado" };
    const paid = await chargePaidCents(tx, charge.id);
    if (moneyToCents(data.amount) > moneyToCents(charge.amountTotal) - paid) {
      return { error: "El pago supera el saldo pendiente del cobro" };
    }
    // The primary key also rejects a token reused concurrently on a different charge.
    const [inserted] = await tx.insert(payments).values({ ...values, id: paymentId })
      .onConflictDoNothing({ target: payments.id }).returning();
    if (!inserted) return { error: "Este intento de pago ya fue utilizado. Actualizá la página" };
    await logActivity({ userId, entityType: "payment", entityId: inserted.id, action: "created",
      newValue: data, note: `Pago de $${data.amount} registrado` }, tx);
    return { caseId: charge.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${data.chargeId}`);
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true };
}

export async function deletePayment(id: string, _caseId?: string, _chargeId?: string) {
  const userId = await getUserId();
  if (!z.string().uuid().safeParse(id).success) return { error: "Pago no encontrado" };
  const result = await db.transaction(async (tx) => {
    const candidate = await tx.query.payments.findFirst({ where: and(eq(payments.id, id), eq(payments.userId, userId)) });
    if (!candidate) return { error: "Pago no encontrado" };
    const charge = await lockOwnedCharge(tx, candidate.chargeId, userId);
    if (!charge) return { error: "Cobro no encontrado" };
    const [existing] = await tx.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, userId))).returning();
    if (!existing) return { error: "Pago no encontrado" };
    await logActivity({ userId, entityType: "payment", entityId: id, action: "deleted", previousValue: existing }, tx);
    return { caseId: charge.caseId, chargeId: charge.id };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${result.chargeId}`);
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true };
}
