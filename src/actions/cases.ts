"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity-log";

const CaseSchema = z.object({
  clientId: z.string().uuid("Cliente invalido"),
  title: z.string().min(1, "El titulo es obligatorio"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "CLOSED", "SUSPENDED"]).default("ACTIVE"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  fee: z.string().optional(),
  preferredPaymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getCases(clientId?: string) {
  const userId = await getUserId();
  return db.query.cases.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      clientId
        ? andOperator(eqOperator(item.userId, userId), eqOperator(item.clientId, clientId))
        : eqOperator(item.userId, userId),
    with: { client: true },
    orderBy: (item, { desc }) => [desc(item.createdAt)],
  });
}

export async function getCase(id: string) {
  const userId = await getUserId();
  return db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      client: true,
      charges: {
        with: { payments: true },
        orderBy: (charge, { desc }) => [desc(charge.createdAt)],
      },
    },
  });
}

export async function createCase(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CaseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db.insert(cases).values({ ...parsed.data, userId }).returning();

  await logActivity({
    userId,
    entityType: "case",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/casos");
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { success: true };
}

export async function updateCase(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CaseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });

  await db
    .update(cases)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(cases.id, id), eq(cases.userId, userId)));

  await logActivity({
    userId,
    entityType: "case",
    entityId: id,
    action: "updated",
    previousValue: existing as Record<string, unknown>,
    newValue: parsed.data,
  });

  revalidatePath("/casos");
  revalidatePath(`/casos/${id}`);
  return { success: true };
}

export async function updateCaseStatus(id: string, status: "ACTIVE" | "CLOSED" | "SUSPENDED") {
  const userId = await getUserId();
  const existing = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });

  await db
    .update(cases)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(cases.id, id), eq(cases.userId, userId)));

  await logActivity({
    userId,
    entityType: "case",
    entityId: id,
    action: "status_changed",
    previousValue: { status: existing?.status },
    newValue: { status },
  });

  revalidatePath("/casos");
  revalidatePath(`/casos/${id}`);
  return { success: true };
}
