"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { charges } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { deriveChargeStatus } from "@/lib/utils";
import { logActivity } from "./activity-log";

const ChargeSchema = z.object({
  caseId: z.string().uuid(),
  description: z.string().min(1, "La descripcion es obligatoria"),
  amountTotal: z.string().min(1, "El monto es obligatorio"),
  dueDate: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getCharges(caseId?: string) {
  const userId = await getUserId();

  const rows = await db.query.charges.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      caseId
        ? andOperator(eqOperator(item.userId, userId), eqOperator(item.caseId, caseId))
        : eqOperator(item.userId, userId),
    with: {
      payments: true,
      case: { with: { client: true } },
    },
    orderBy: (item, { desc }) => [desc(item.createdAt)],
  });

  return rows.map((charge) => {
    const amountPaid = charge.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0).toFixed(2);
    const derivedStatus = deriveChargeStatus(
      charge.amountTotal,
      amountPaid,
      charge.dueDate,
      charge.cancelledAt
    );

    return { ...charge, amountPaid, derivedStatus };
  });
}

export async function createCharge(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ChargeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(charges).values({ ...parsed.data, userId }).returning();

  await logActivity({
    userId,
    entityType: "charge",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/cobros");
  revalidatePath(`/casos/${parsed.data.caseId}`);
  return { success: true };
}

export async function updateDueDate(chargeId: string, newDueDate: string) {
  const userId = await getUserId();
  const existing = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, chargeId), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Cobro no encontrado" };

  await db
    .update(charges)
    .set({ dueDate: newDueDate, updatedAt: new Date() })
    .where(and(eq(charges.id, chargeId), eq(charges.userId, userId)));

  await logActivity({
    userId,
    entityType: "charge",
    entityId: chargeId,
    action: "due_date_changed",
    previousValue: { dueDate: existing.dueDate },
    newValue: { dueDate: newDueDate },
  });

  revalidatePath("/cobros");
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
