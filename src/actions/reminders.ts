"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getWorkspaceAccess, requireAdminAccess } from "@/lib/workspace-access";
import { canAccessReminder, resolveReminderAssignee } from "@/lib/reminder-assignment";
import {
  operationalCaseColumns, operationalClientColumns, operationalReminderColumns,
  projectOperationalCase, projectOperationalClient, projectOperationalReminder,
} from "@/lib/operational-projections";
import { normalizeReminderMutationInput } from "@/lib/form-normalizers";
import { logActivity } from "@/lib/activity-log";

const ReminderSchema = z.object({
  assigneeUserId: z.string().uuid().optional().or(z.literal("")),
  caseId: z.string().uuid().optional().or(z.literal("")),
  clientId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "El titulo es obligatorio"),
  description: z.string().optional(),
  reminderDate: z.string().min(1, "La fecha es obligatoria")
    .refine(value => !Number.isNaN(new Date(value).getTime()), "La fecha es inválida"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

async function getEnabledAssistants(ownerUserId: string) {
  return db.query.workspaceMembers.findMany({
    columns: { userId: true, displayName: true },
    where: (member, { and, eq }) => and(
      eq(member.ownerUserId, ownerUserId),
      eq(member.role, "COLLABORATOR"),
      eq(member.enabled, true),
    ),
    orderBy: (member, { asc }) => [asc(member.displayName)],
  });
}

async function getWorkspaceNames(ownerUserId: string) {
  const members = await db.query.workspaceMembers.findMany({
    columns: { userId: true, displayName: true },
    where: (member, { eq }) => eq(member.ownerUserId, ownerUserId),
  });
  return new Map(members.map(member => [member.userId, member.displayName]));
}

function reminderMutationWhere(access: Awaited<ReturnType<typeof getWorkspaceAccess>>, id: string) {
  const officeReminder = and(eq(reminders.id, id), eq(reminders.userId, access.ownerUserId));
  return access.role === "ADMIN"
    ? officeReminder
    : and(officeReminder, or(
      eq(reminders.createdByUserId, access.actorUserId),
      eq(reminders.assigneeUserId, access.actorUserId),
    ));
}

export async function getReminders() {
  const access = await getWorkspaceAccess();
  const userId = access.ownerUserId;
  const [rows, names] = await Promise.all([db.query.reminders.findMany({
    columns: operationalReminderColumns,
    where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
    with: {
      case: { columns: operationalCaseColumns, with: { client: { columns: operationalClientColumns } } },
      client: { columns: operationalClientColumns },
    },
    orderBy: (item, { asc }) => [asc(item.reminderDate)],
  }), getWorkspaceNames(userId)]);
  return rows.filter(row => canAccessReminder(access, row) &&
    (!row.client || row.client.userId === userId) &&
    (!row.case || (row.case.userId === userId && row.case.client.userId === userId))
  ).map(row => ({
    ...projectOperationalReminder(row),
    client: row.client ? projectOperationalClient(row.client) : null,
    case: row.case ? {
      ...projectOperationalCase(row.case),
      client: projectOperationalClient(row.case.client),
    } : null,
    assigneeName: row.assigneeUserId ? (names.get(row.assigneeUserId) ?? "Asistente legal") : (names.get(userId) ?? "Victoria"),
    creatorName: row.createdByUserId ? (names.get(row.createdByUserId) ?? "Usuario anterior") : "Usuario anterior",
  }));
}

async function ownsReminderReferences(userId: string, values: { clientId?: string; caseId?: string }) {
  if (values.clientId) {
    const client = await db.query.clients.findFirst({
      columns: { id: true },
      where: (item, { and, eq }) => and(eq(item.id, values.clientId!), eq(item.userId, userId)),
    });
    if (!client) return false;
  }
  if (values.caseId) {
    const linkedCase = await db.query.cases.findFirst({
      columns: { id: true, clientId: true },
      where: (item, { and, eq }) => and(eq(item.id, values.caseId!), eq(item.userId, userId)),
      with: { client: { columns: { userId: true } } },
    });
    if (!linkedCase || linkedCase.client.userId !== userId) return false;
  }
  return true;
}

export async function getReminderReferences() {
  const { ownerUserId: userId } = await getWorkspaceAccess();

  const [clientRows, caseRows, assistants] = await Promise.all([
    db.query.clients.findMany({
      columns: { id: true, name: true },
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { asc }) => [asc(item.name)],
    }),
    db.query.cases.findMany({
      columns: { id: true, title: true },
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { asc }) => [asc(item.title)],
      with: { client: { columns: { userId: true, name: true } } },
    }),
    getEnabledAssistants(userId),
  ]);

  return {
    clients: clientRows.map((client) => ({ id: client.id, name: client.name })),
    cases: caseRows.filter(currentCase => currentCase.client.userId === userId).map((currentCase) => ({
      id: currentCase.id,
      title: currentCase.title,
      clientName: currentCase.client.name,
    })),
    assistants,
  };
}

export async function createReminder(formData: FormData) {
  const access = await getWorkspaceAccess();
  const { ownerUserId: userId, actorUserId } = access;
  const raw = Object.fromEntries(formData.entries());
  const parsed = ReminderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  if (!await ownsReminderReferences(userId, parsed.data)) return { error: "Caso o cliente no encontrado" };

  const assistants = await getEnabledAssistants(userId);
  let assigneeUserId: string | null;
  try {
    assigneeUserId = resolveReminderAssignee(
      access,
      Object.hasOwn(raw, "assigneeUserId") ? (parsed.data.assigneeUserId || null) : undefined,
      assistants.map(assistant => assistant.userId),
    );
  } catch {
    return { error: "No tienes permiso para elegir esa asignación" };
  }

  const normalized = normalizeReminderMutationInput(parsed.data);
  const [inserted] = await db
    .insert(reminders)
    .values({
      ...normalized,
      userId,
      createdByUserId: actorUserId,
      assigneeUserId,
    })
    .returning();

  await logActivity({
    userId,
    actorUserId,
    entityType: "reminder",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function updateReminder(id: string, formData: FormData) {
  const access = await getWorkspaceAccess();
  const { ownerUserId: userId, actorUserId } = access;
  const raw = Object.fromEntries(formData.entries());
  const parsed = ReminderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const existing = await db.query.reminders.findFirst({
    where: (item, { and, eq }) => and(eq(item.id, id), eq(item.userId, userId)),
  });
  if (!existing || !canAccessReminder(access, existing)) return { error: "Recordatorio no encontrado" };
  if (!await ownsReminderReferences(userId, parsed.data)) return { error: "Caso o cliente no encontrado" };

  const assistants = await getEnabledAssistants(userId);
  let assigneeUserId: string | null;
  try {
    assigneeUserId = resolveReminderAssignee(
      access,
      Object.hasOwn(raw, "assigneeUserId") ? (parsed.data.assigneeUserId || null) : undefined,
      assistants.map(assistant => assistant.userId),
    );
  } catch {
    return { error: "No tienes permiso para elegir esa asignación" };
  }

  const normalized = normalizeReminderMutationInput(parsed.data);
  const [updated] = await db
    .update(reminders)
    .set({ ...normalized, assigneeUserId, updatedAt: new Date() })
    .where(reminderMutationWhere(access, id))
    .returning({ id: reminders.id });
  if (!updated) return { error: "La tarea cambió mientras la editabas. Volvé a intentarlo." };

  await logActivity({
    userId,
    actorUserId,
    entityType: "reminder",
    entityId: id,
    action: "updated",
    newValue: parsed.data,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}

export async function completeReminder(id: string) {
  const access = await getWorkspaceAccess();
  const { ownerUserId: userId, actorUserId } = access;
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing || !canAccessReminder(access, existing)) return { error: "Recordatorio no encontrado" };

  const [updated] = await db
    .update(reminders)
    .set({ completed: true, completedAt: new Date(), updatedAt: new Date() })
    .where(reminderMutationWhere(access, id))
    .returning({ id: reminders.id });
  if (!updated) return { error: "La tarea cambió mientras la resolvías. Volvé a intentarlo." };

  await logActivity({
    userId,
    actorUserId,
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
  const access = await getWorkspaceAccess();
  const { ownerUserId: userId, actorUserId } = access;
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing || !canAccessReminder(access, existing)) return { error: "Recordatorio no encontrado" };

  const [updated] = await db
    .update(reminders)
    .set({ completed: false, completedAt: null, updatedAt: new Date() })
    .where(reminderMutationWhere(access, id))
    .returning({ id: reminders.id });
  if (!updated) return { error: "La tarea cambió mientras la reabrías. Volvé a intentarlo." };

  await logActivity({
    userId,
    actorUserId,
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
  const { ownerUserId: userId, actorUserId } = await requireAdminAccess();
  const existing = await db.query.reminders.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Recordatorio no encontrado" };

  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));

  await logActivity({
    userId,
    actorUserId,
    entityType: "reminder",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
  });

  revalidatePath("/recordatorios");
  return { success: true };
}
