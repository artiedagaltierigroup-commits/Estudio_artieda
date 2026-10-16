"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { normalizeReminderMutationInput } from "@/lib/form-normalizers";
import { logActivity } from "@/lib/activity-log";

const ReminderSchema = z.object({
  caseId: z.string().uuid().optional().or(z.literal("")),
  clientId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "El titulo es obligatorio"),
  description: z.string().optional(),
  reminderDate: z.string().min(1, "La fecha es obligatoria"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getReminders() {
  const userId = await getUserId();
  const rows = await db.query.reminders.findMany({
    where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
    with: {
      case: { with: { client: true } },
      client: true,
    },
    orderBy: (item, { asc }) => [asc(item.reminderDate)],
  });
  return rows.filter(row =>
    (!row.client || row.client.userId === userId) &&
    (!row.case || (row.case.userId === userId && row.case.client.userId === userId))
  );
}

async function ownsReminderReferences(userId: string, values: { clientId?: string; caseId?: string }) {
  if (values.clientId) {
    const client = await db.query.clients.findFirst({
      where: (item, { and, eq }) => and(eq(item.id, values.clientId!), eq(item.userId, userId)),
    });
    if (!client) return false;
  }
  if (values.caseId) {
    const linkedCase = await db.query.cases.findFirst({
      where: (item, { and, eq }) => and(eq(item.id, values.caseId!), eq(item.userId, userId)),
      with: { client: true },
    });
    if (!linkedCase || linkedCase.client.userId !== userId) return false;
  }
  return true;
}

export async function getReminderReferences() {
  const userId = await getUserId();

  const [clientRows, caseRows] = await Promise.all([
    db.query.clients.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { asc }) => [asc(item.name)],
    }),
    db.query.cases.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { asc }) => [asc(item.title)],
      with: { client: true },
    }),
  ]);

  return {
    clients: clientRows.map((client) => ({ id: client.id, name: client.name })),
    cases: caseRows.filter(currentCase => currentCase.client.userId === userId).map((currentCase) => ({
      id: currentCase.id,
      title: currentCase.title,
      clientName: currentCase.client.name,
    })),
  };
}

export async function createReminder(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ReminderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  if (!await ownsReminderReferences(userId, parsed.data)) return { error: "Caso o cliente no encontrado" };

  const normalized = normalizeReminderMutationInput(parsed.data);
  const [inserted] = await db
    .insert(reminders)
    .values({
      ...normalized,
      userId,
    })
    .returning();

  await logActivity({
    userId,
    entityType: "reminder",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function updateReminder(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ReminderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const existing = await db.query.reminders.findFirst({
    where: (item, { and, eq }) => and(eq(item.id, id), eq(item.userId, userId)),
  });
  if (!existing) return { error: "Recordatorio no encontrado" };
  if (!await ownsReminderReferences(userId, parsed.data)) return { error: "Caso o cliente no encontrado" };

  const normalized = normalizeReminderMutationInput(parsed.data);
  await db
    .update(reminders)
    .set({ ...normalized, updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));

  await logActivity({
    userId,
    entityType: "reminder",
    entityId: id,
    action: "updated",
    newValue: parsed.data,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function completeReminder(id: string) {
  const userId = await getUserId();
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Recordatorio no encontrado" };

  await db
    .update(reminders)
    .set({ completed: true, completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));

  await logActivity({
    userId,
    entityType: "reminder",
    entityId: id,
    action: "status_changed",
    previousValue: { completed: existing.completed, completedAt: existing.completedAt },
    newValue: { completed: true, completedAt: new Date() },
    note: "Recordatorio marcado como resuelto",
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function reopenReminder(id: string) {
  const userId = await getUserId();
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Recordatorio no encontrado" };

  await db
    .update(reminders)
    .set({ completed: false, completedAt: null, updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));

  await logActivity({
    userId,
    entityType: "reminder",
    entityId: id,
    action: "status_changed",
    previousValue: { completed: existing.completed, completedAt: existing.completedAt },
    newValue: { completed: false, completedAt: null },
    note: "Recordatorio reabierto",
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function deleteReminder(id: string) {
  const userId = await getUserId();
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Recordatorio no encontrado" };

  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));

  await logActivity({
    userId,
    entityType: "reminder",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}
