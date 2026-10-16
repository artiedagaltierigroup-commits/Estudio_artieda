"use server";

import { and, eq, exists, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, cases, charges, clients, payments } from "@/db/schema";
import { filterChargesByFilters, sortChargesByDueDate, summarizeChargeRecord } from "@/lib/charge-insights";
import { buildInitialChargePayment } from "@/lib/charge-mutations";
import { ChargeMoneySchema, moneyToCents, OptionalChargeDateSchema } from "@/lib/charge-money";
import { chargePaidCents, hasOwnedChargeCase, lockOwnedCharge } from "@/lib/charge-transactions";
import { requireAdminAccess } from "@/lib/workspace-access";
import { logActivity } from "@/lib/activity-log";

const ChargeSchema = z.object({
  caseId: z.string().uuid("Caso inválido"),
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  amountTotal: ChargeMoneySchema,
  dueDate: OptionalChargeDateSchema,
  markAsPaid: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
  notes: z.string().optional(),
});

const CreateChargeSchema = ChargeSchema.extend({
  chargeId: z.string().uuid("Actualizá la página antes de crear el cobro"),
});

function normalizeOptionalText(value?: string) {
  return value?.trim() || null;
}

function toChargeValues(data: z.infer<typeof ChargeSchema>) {
  return { caseId: data.caseId, description: data.description, amountTotal: data.amountTotal,
    dueDate: normalizeOptionalText(data.dueDate), notes: normalizeOptionalText(data.notes) };
}

async function getUserId(): Promise<string> {
  return (await requireAdminAccess()).ownerUserId;
}

// Filter the parents in SQL too: old inconsistent links must not reveal another owner's data.
function ownedParents(userId: string) {
  return exists(db.select({ id: cases.id }).from(cases)
    .innerJoin(clients, and(eq(clients.id, cases.clientId), eq(clients.userId, userId)))
    .where(and(eq(cases.id, charges.caseId), eq(cases.userId, userId))));
}

export async function getCharges(filters?: { query?: string; status?: string; caseId?: string }) {
  const userId = await getUserId();
  const rows = await db.query.charges.findMany({
    where: and(eq(charges.userId, userId), ownedParents(userId), filters?.caseId ? eq(charges.caseId, filters.caseId) : undefined),
    with: {
      payments: { where: eq(payments.userId, userId), orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)] },
      case: { with: { client: true } },
    },
    orderBy: (item, { desc }) => [desc(item.updatedAt)],
  });
  const enriched = rows.map((charge) => {
    const summary = summarizeChargeRecord(charge);
    return { ...charge, amountPaid: summary.amountPaid.toFixed(2), balance: summary.balance, derivedStatus: summary.derivedStatus };
  });
  return sortChargesByDueDate(filterChargesByFilters(enriched, filters ?? {}));
}

export async function getCharge(id: string) {
  const userId = await getUserId();
  if (!z.string().uuid().safeParse(id).success) return null;
  const charge = await db.query.charges.findFirst({
    where: and(eq(charges.id, id), eq(charges.userId, userId), ownedParents(userId)),
    with: {
      payments: { where: eq(payments.userId, userId), orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)] },
      case: { with: { client: true } },
    },
  });
  if (!charge) return null;
  const summary = summarizeChargeRecord(charge);
  return { ...charge, amountPaid: summary.amountPaid.toFixed(2), balance: summary.balance, derivedStatus: summary.derivedStatus };
}

export async function createCharge(formData: FormData) {
  const userId = await getUserId();
  const parsed = CreateChargeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { chargeId } = parsed.data;
  const creation = { ...toChargeValues(parsed.data), markAsPaid: parsed.data.markAsPaid };
  const result = await db.transaction(async (tx) => {
    // There is no row to lock on first creation. Serialize all attempts for this UUID.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`charge-create:${chargeId}`}, 0))`);
    const [existing] = await tx.select().from(charges).where(eq(charges.id, chargeId)).for("update");
    const original = await tx.query.activityLog.findFirst({
      where: and(eq(activityLog.entityType, "charge"), eq(activityLog.entityId, chargeId), eq(activityLog.action, "created")),
    });
    if (existing) {
      const originalValues = original?.newValue && typeof original.newValue === "object" && !Array.isArray(original.newValue)
        ? original.newValue as Record<string, unknown> : null;
      const same = existing.userId === userId && original?.userId === userId && originalValues &&
        Object.entries(creation).every(([key, value]) => originalValues[key] === value);
      return same ? { chargeId: existing.id, caseId: existing.caseId }
        : { error: "Este intento de alta ya fue utilizado con otros datos. Actualizá la página" };
    }
    const removed = original ?? await tx.query.activityLog.findFirst({
      where: and(eq(activityLog.entityType, "charge"), eq(activityLog.entityId, chargeId), eq(activityLog.action, "deleted")),
      columns: { id: true },
    });
    if (removed) return { error: "Este cobro fue eliminado. Actualizá la página antes de crear otro" };
    if (!await hasOwnedChargeCase(tx, parsed.data.caseId, userId)) return { error: "Caso no encontrado" };
    const [inserted] = await tx.insert(charges).values({ ...toChargeValues(parsed.data), id: chargeId, userId })
      .onConflictDoNothing({ target: charges.id }).returning();
    if (!inserted) return { error: "Este intento de alta ya fue utilizado. Actualizá la página" };
    const initialPayment = buildInitialChargePayment(parsed.data);
    await logActivity({ userId, entityType: "charge", entityId: inserted.id, action: "created", newValue: creation }, tx);
    if (initialPayment) {
      const [createdPayment] = await tx.insert(payments).values({ chargeId: inserted.id, userId,
        ...initialPayment, method: null, notes: "Pago registrado al crear el cobro" }).returning({ id: payments.id });
      await logActivity({ userId, entityType: "payment", entityId: createdPayment.id, action: "created",
        newValue: initialPayment, note: "Pago completo registrado desde el alta del cobro" }, tx);
    }
    return { chargeId: inserted.id, caseId: inserted.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${result.chargeId}`);
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true, chargeId: result.chargeId, caseId: result.caseId };
}

export async function updateCharge(id: string, formData: FormData) {
  const userId = await getUserId();
  const parsed = ChargeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  if (!z.string().uuid().safeParse(id).success) return { error: "Cobro no encontrado" };
  if (parsed.data.markAsPaid) return { error: "Registrá el pago desde la ficha del cobro" };
  const result = await db.transaction(async (tx) => {
    const existing = await lockOwnedCharge(tx, id, userId);
    if (!existing) return { error: "Cobro no encontrado" };
    if (!await hasOwnedChargeCase(tx, parsed.data.caseId, userId)) return { error: "Caso no encontrado" };
    if (moneyToCents(parsed.data.amountTotal) < await chargePaidCents(tx, id)) {
      return { error: "El monto total no puede ser menor que lo ya pagado" };
    }
    await tx.update(charges).set({ ...toChargeValues(parsed.data), updatedAt: new Date() })
      .where(and(eq(charges.id, id), eq(charges.userId, userId)));
    await logActivity({ userId, entityType: "charge", entityId: id, action: "updated", previousValue: existing, newValue: parsed.data }, tx);
    return { previousCaseId: existing.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${id}`);
  revalidatePath(`/cobros/${id}/editar`);
  revalidatePath(`/casos/${parsed.data.caseId}`);
  if (result.previousCaseId !== parsed.data.caseId) revalidatePath(`/casos/${result.previousCaseId}`);
  return { success: true };
}

export async function updateDueDate(chargeId: string, newDueDate: string, followUpDate?: string) {
  const userId = await getUserId();
  const parsed = z.object({ dueDate: OptionalChargeDateSchema, followUpDate: OptionalChargeDateSchema })
    .safeParse({ dueDate: newDueDate, followUpDate });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  if (!z.string().uuid().safeParse(chargeId).success) return { error: "Cobro no encontrado" };
  const result = await db.transaction(async (tx) => {
    const existing = await lockOwnedCharge(tx, chargeId, userId);
    if (!existing) return { error: "Cobro no encontrado" };
    const values = { dueDate: normalizeOptionalText(parsed.data.dueDate), followUpDate: normalizeOptionalText(parsed.data.followUpDate) };
    await tx.update(charges).set({ ...values, updatedAt: new Date() }).where(eq(charges.id, chargeId));
    await logActivity({ userId, entityType: "charge", entityId: chargeId, action: "due_date_changed",
      previousValue: { dueDate: existing.dueDate, followUpDate: existing.followUpDate }, newValue: values }, tx);
    return { caseId: existing.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${chargeId}`);
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true };
}

export async function cancelCharge(chargeId: string, reason?: string) {
  const userId = await getUserId();
  if (!z.string().uuid().safeParse(chargeId).success) return { error: "Cobro no encontrado" };
  const result = await db.transaction(async (tx) => {
    const existing = await lockOwnedCharge(tx, chargeId, userId);
    if (!existing) return { error: "Cobro no encontrado" };
    if (existing.cancelledAt) return { error: "El cobro ya está cancelado" };
    const cancelledAt = new Date();
    const values = { cancelledAt, cancellationReason: normalizeOptionalText(reason) };
    await tx.update(charges).set({ ...values, updatedAt: cancelledAt }).where(eq(charges.id, chargeId));
    await logActivity({ userId, entityType: "charge", entityId: chargeId, action: "status_changed",
      previousValue: { cancelledAt: existing.cancelledAt, cancellationReason: existing.cancellationReason },
      newValue: values, note: "Cobro cancelado" }, tx);
    return { caseId: existing.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/cobros/${chargeId}`);
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true };
}

export async function deleteCharge(id: string) {
  const userId = await getUserId();
  if (!z.string().uuid().safeParse(id).success) return { error: "Cobro no encontrado" };
  const result = await db.transaction(async (tx) => {
    const existing = await lockOwnedCharge(tx, id, userId);
    if (!existing) return { error: "Cobro no encontrado" };
    await tx.delete(charges).where(eq(charges.id, id));
    await logActivity({ userId, entityType: "charge", entityId: id, action: "deleted", previousValue: existing }, tx);
    return { caseId: existing.caseId };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/cobros");
  revalidatePath(`/casos/${result.caseId}`);
  return { success: true };
}
