"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { charges, payments } from "@/db/schema";
import { filterChargesByFilters, sortChargesByDueDate, summarizeChargeRecord } from "@/lib/charge-insights";
import { buildInitialChargePayment } from "@/lib/charge-mutations";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

const ChargeSchema = z.object({
  caseId: z.string().uuid("Caso invalido"),
  description: z.string().trim().min(1, "La descripcion es obligatoria"),
  amountTotal: z.string().min(1, "El monto es obligatorio"),
  dueDate: z.string().optional(),
  markAsPaid: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
  notes: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toChargeValues(data: z.infer<typeof ChargeSchema>) {
  return {
    caseId: data.caseId,
    description: data.description.trim(),
    amountTotal: data.amountTotal,
    dueDate: normalizeOptionalText(data.dueDate),
    notes: normalizeOptionalText(data.notes),
  };
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getCharges(filters?: { query?: string; status?: string; caseId?: string }) {
  const userId = await getUserId();

  const rows = await db.query.charges.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      filters?.caseId
        ? andOperator(eqOperator(item.userId, userId), eqOperator(item.caseId, filters.caseId))
        : eqOperator(item.userId, userId),
    with: {
      payments: {
        orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)],
      },
      case: { with: { client: true } },
    },
    orderBy: (item, { desc }) => [desc(item.updatedAt)],
  });

  const enriched = rows.map((charge) => {
    const summary = summarizeChargeRecord(charge);
    return {
      ...charge,
      amountPaid: summary.amountPaid.toFixed(2),
      balance: summary.balance,
      derivedStatus: summary.derivedStatus,
    };
  });

  return sortChargesByDueDate(filterChargesByFilters(enriched, filters ?? {}));
}

export async function getCharge(id: string) {
  const userId = await getUserId();
  const charge = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      payments: {
        orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)],
      },
      case: {
        with: {
          client: true,
        },
      },
    },
  });

  if (!charge) return null;

  const summary = summarizeChargeRecord(charge);

  return {
    ...charge,
    amountPaid: summary.amountPaid.toFixed(2),
    balance: summary.balance,
    derivedStatus: summary.derivedStatus,
  };
}

export async function createCharge(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ChargeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(charges).values({ ...toChargeValues(parsed.data), userId }).returning();
  const initialPayment = buildInitialChargePayment(parsed.data);

  const [createdPayment] = initialPayment
    ? await db
        .insert(payments)
        .values({
          chargeId: inserted.id,
          userId,
          amount: initialPayment.amount,
          paymentDate: initialPayment.paymentDate,
          method: null,
          notes: "Pago registrado al crear el cobro",
        })
        .returning({ id: payments.id })
    : [];

  await logActivity({
    userId,
    entityType: "charge",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  if (initialPayment && createdPayment) {
    await logActivity({
      userId,
      entityType: "payment",
      entityId: createdPayment.id,
      action: "created",
      newValue: initialPayment,
      note: "Pago completo registrado desde el alta del cobro",
    });
  }

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${inserted.id}`);
  revalidatePath(`/casos/${parsed.data.caseId}`);
  return { success: true, chargeId: inserted.id, caseId: parsed.data.caseId };
}

export async function updateCharge(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ChargeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Cobro no encontrado" };

  await db
    .update(charges)
    .set({ ...toChargeValues(parsed.data), updatedAt: new Date() })
    .where(and(eq(charges.id, id), eq(charges.userId, userId)));

  await logActivity({
    userId,
    entityType: "charge",
    entityId: id,
    action: "updated",
    previousValue: existing as Record<string, unknown>,
    newValue: parsed.data,
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${id}`);
  revalidatePath(`/cobros/${id}/editar`);
  revalidatePath(`/casos/${parsed.data.caseId}`);
  return { success: true };
}

export async function updateDueDate(chargeId: string, newDueDate: string, followUpDate?: string) {
  const userId = await getUserId();
  const existing = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, chargeId), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Cobro no encontrado" };

  await db
    .update(charges)
    .set({
      dueDate: normalizeOptionalText(newDueDate),
      followUpDate: normalizeOptionalText(followUpDate),
      updatedAt: new Date(),
    })
    .where(and(eq(charges.id, chargeId), eq(charges.userId, userId)));

  await logActivity({
    userId,
    entityType: "charge",
    entityId: chargeId,
    action: "due_date_changed",
    previousValue: { dueDate: existing.dueDate, followUpDate: existing.followUpDate },
    newValue: { dueDate: normalizeOptionalText(newDueDate), followUpDate: normalizeOptionalText(followUpDate) },
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${chargeId}`);
  revalidatePath(`/casos/${existing.caseId}`);
  return { success: true };
}

export async function cancelCharge(chargeId: string, reason?: string) {
  const userId = await getUserId();
  const existing = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, chargeId), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Cobro no encontrado" };
  if (existing.cancelledAt) return { error: "El cobro ya esta cancelado" };

  const cancelledAt = new Date();

  await db
    .update(charges)
    .set({
      cancelledAt,
      cancellationReason: reason?.trim() || null,
      updatedAt: cancelledAt,
    })
    .where(and(eq(charges.id, chargeId), eq(charges.userId, userId)));

  await logActivity({
    userId,
    entityType: "charge",
    entityId: chargeId,
    action: "status_changed",
    previousValue: {
      cancelledAt: existing.cancelledAt,
      cancellationReason: existing.cancellationReason,
    },
    newValue: {
      cancelledAt,
      cancellationReason: reason?.trim() || null,
    },
    note: "Cobro cancelado",
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${chargeId}`);
  revalidatePath(`/casos/${existing.caseId}`);
  return { success: true };
}

export async function deleteCharge(id: string) {
  const userId = await getUserId();
  const existing = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Cobro no encontrado" };

  await db.delete(charges).where(and(eq(charges.id, id), eq(charges.userId, userId)));

  await logActivity({
    userId,
    entityType: "charge",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
  });

  revalidatePath("/cobros");
  revalidatePath(`/casos/${existing.caseId}`);
  return { success: true };
}
