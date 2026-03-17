"use server";

import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "./activity-log";

const PaymentSchema = z.object({
  chargeId: z.string().uuid(),
  amount: z.string().min(1, "El monto es obligatorio"),
  paymentDate: z.string().min(1, "La fecha es obligatoria"),
  method: z.string().optional(),
  notes: z.string().optional(),
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function createPayment(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = PaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(payments).values({ ...parsed.data, userId }).returning();
  await logActivity({
    userId,
    entityType: "payment",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
    note: `Pago de $${parsed.data.amount} registrado`,
  });

  revalidatePath("/cobros");
  return { success: true };
}

export async function deletePayment(id: string, caseId?: string) {
  const userId = await getUserId();
  const existing = await db.query.payments.findFirst({
    where: (p, { eq, and }) => and(eq(p.id, id), eq(p.userId, userId)),
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
  if (caseId) revalidatePath(`/casos/${caseId}`);
  return { success: true };
}
