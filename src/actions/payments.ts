"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { summarizeChargeRecord } from "@/lib/charge-insights";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

const PaymentSchema = z.object({
  chargeId: z.string().uuid(),
  amount: z.string().min(1, "El monto es obligatorio"),
  paymentDate: z.string().min(1, "La fecha es obligatoria"),
  method: z.string().optional(),
  notes: z.string().optional(),
});

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function createPayment(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = PaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const charge = await db.query.charges.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, parsed.data.chargeId), eqOperator(item.userId, userId)),
    with: {
      payments: true,
    },
  });
  if (!charge) return { error: "Cobro no encontrado" };

  const chargeSummary = summarizeChargeRecord(charge);
  const requestedAmount = Number(parsed.data.amount);
  if (requestedAmount <= 0) return { error: "El pago debe ser mayor a cero" };
  if (chargeSummary.derivedStatus === "CANCELLED") return { error: "No se pueden registrar pagos en un cobro cancelado" };
  if (requestedAmount > chargeSummary.balance) return { error: "El pago supera el saldo pendiente del cobro" };

  const [inserted] = await db
    .insert(payments)
    .values({
      ...parsed.data,
      method: normalizeOptionalText(parsed.data.method),
      notes: normalizeOptionalText(parsed.data.notes),
      userId,
    })
    .returning();

  await logActivity({
    userId,
    entityType: "payment",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
    note: `Pago de $${parsed.data.amount} registrado`,
  });

  revalidatePath("/cobros");
  revalidatePath(`/cobros/${parsed.data.chargeId}`);
  revalidatePath(`/casos/${charge.caseId}`);
  return { success: true };
}

export async function deletePayment(id: string, caseId?: string, chargeId?: string) {
  const userId = await getUserId();
  const existing = await db.query.payments.findFirst({
    where: (payment, { eq: eqOperator, and: andOperator }) =>
      andOperator(eqOperator(payment.id, id), eqOperator(payment.userId, userId)),
  });
  if (!existing) return { error: "Pago no encontrado" };

  await db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, userId)));
  await logActivity({
    userId,
    entityType: "payment",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
  });

  revalidatePath("/cobros");
  if (chargeId) revalidatePath(`/cobros/${chargeId}`);
  if (caseId) revalidatePath(`/casos/${caseId}`);
  return { success: true };
}
