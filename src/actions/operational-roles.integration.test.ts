import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { cases, clients, reminders } from "@/db/schema";
import { createCase, getCase, updateCase, updateCaseStatus } from "./cases";
import { createClientAction, createClientInlineAction, deleteClient, getClient, getClientRecord, updateClient } from "./clients";
import { getOperationalCase, getOperationalCases, getOperationalClient, getOperationalClients } from "./operational";
import { completeReminder, createReminder, deleteReminder, getReminderReferences, getReminders, reopenReminder, updateReminder } from "./reminders";

const localUrl = process.env.OPERATIONAL_ROLES_TEST_DATABASE_URL;
const state = vi.hoisted(() => ({
  actor: "", owner: "", role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR", connection: undefined as Sql | undefined,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workspace-access", () => ({
  getWorkspaceAccess: async () => ({ actorUserId: state.actor, ownerUserId: state.owner, role: state.role }),
  requireAdminAccess: async () => {
    if (state.role !== "ADMIN") throw new Error("Acceso denegado");
    return { actorUserId: state.actor, ownerUserId: state.owner, role: state.role };
  },
}));
vi.mock("@/db", async () => {
  const target = process.env.OPERATIONAL_ROLES_TEST_DATABASE_URL;
  if (!target) return { db: {} };
  const url = new URL(target);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/artieda_operational_roles_test") {
    throw new Error("Only the isolated operational roles test database is permitted");
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("@/db/schema");
  state.connection = postgres(target, { max: 2, prepare: false, onnotice: () => {} });
  return { db: drizzle(state.connection, { schema }) };
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe.skipIf(!localUrl)("shared operational actions against a real isolated database", () => {
  const owner = randomUUID(), collaborator = randomUUID(), outsider = randomUUID();
  const clientId = randomUUID(), otherClientId = randomUUID(), caseId = randomUUID(), otherCaseId = randomUUID();
  const reminderId = randomUUID(), otherReminderId = randomUUID();

  beforeEach(async () => {
    state.actor = collaborator;
    state.owner = owner;
    state.role = "COLLABORATOR";
    // Dedicated synthetic database only; never run on a production clone.
    await state.connection!.unsafe("TRUNCATE public.clients, public.reminders, public.activity_log CASCADE");
    await db.insert(clients).values([
      { id: clientId, userId: owner, name: "Cliente compartido", notes: "Texto existente con importe 500" },
      { id: otherClientId, userId: outsider, name: "Cliente ajeno" },
    ]);
    await db.insert(cases).values([
      { id: caseId, userId: owner, clientId, title: "Caso compartido", fee: "9876.54", preferredPaymentMethod: "CASH" },
      { id: otherCaseId, userId: outsider, clientId: otherClientId, title: "Caso ajeno", fee: "123.45" },
    ]);
    await db.insert(reminders).values([
      { id: reminderId, userId: owner, clientId, caseId, title: "Recordatorio compartido 500", reminderDate: new Date("2099-01-01T12:00:00Z") },
      { id: otherReminderId, userId: outsider, clientId: otherClientId, caseId: otherCaseId, title: "Recordatorio ajeno", reminderDate: new Date("2099-01-01T12:00:00Z") },
    ]);
  });
  afterAll(async () => { await state.connection?.end(); });

  it("shows all of the assigned office and no structured money or other-office records", async () => {
    const results = await Promise.all([
      getOperationalClients(), getOperationalClient(clientId), getOperationalCases(),
      getOperationalCase(caseId), getReminders(), getReminderReferences(), getClientRecord(clientId),
    ]);
    const text = JSON.stringify(results);
    expect(text).toContain("Cliente compartido");
    expect(text).toContain("Texto existente con importe 500");
    expect(text).toContain("Recordatorio compartido 500");
    expect(text).not.toContain("ajeno");
    expect(text).not.toContain("9876.54");
    for (const field of ["fee", "preferredPaymentMethod", "charges", "payments", "financeSummary", "balance"]) {
      expect(text).not.toContain(`"${field}":`);
    }
    expect(await getOperationalClient(otherClientId)).toBeNull();
    expect(await getOperationalCase(otherCaseId)).toBeNull();
    expect(await getClientRecord(otherClientId)).toBeUndefined();
  });

  it("creates operational records in the owner office and attributes each write to the collaborator", async () => {
    const createdClient = await createClientAction(form({ name: "Alta colaborador" }));
    expect(createdClient).toHaveProperty("success", true);
    expect(await createClientInlineAction({ name: "Alta rápida" })).toHaveProperty("success", true);
    expect(await createCase(form({ clientId, title: "Alta caso" }))).toHaveProperty("success", true);
    expect(await createReminder(form({ clientId, caseId, title: "Alta recordatorio", reminderDate: "2099-02-01T09:00:00-03:00" }))).toHaveProperty("success", true);
    const logs = await db.query.activityLog.findMany();
    expect(logs).toHaveLength(4);
    for (const log of logs) expect(log).toMatchObject({ userId: owner, actorUserId: collaborator });
    const created = await db.query.clients.findFirst({ where: (row, { eq }) => eq(row.id, createdClient.clientId!) });
    expect(created?.userId).toBe(owner);
    const newCase = await db.query.cases.findFirst({ where: (row, { eq }) => eq(row.title, "Alta caso") });
    expect(newCase).toMatchObject({ userId: owner, fee: null, preferredPaymentMethod: null });
  });

  it("edits and completes shared records while preserving owner financial fields", async () => {
    expect(await updateClient(clientId, form({ name: "Nombre actualizado" }))).toHaveProperty("success", true);
    expect(await updateCase(caseId, form({ clientId, title: "Título actualizado" }))).toHaveProperty("success", true);
    expect(await updateCaseStatus(caseId, "SUSPENDED")).toHaveProperty("success", true);
    expect(await updateReminder(reminderId, form({ title: "Pendiente actualizado", reminderDate: "2099-03-01T14:00:00Z" }))).toHaveProperty("success", true);
    expect(await completeReminder(reminderId)).toHaveProperty("success", true);
    expect((await getReminders())[0].completed).toBe(true);
    expect(await reopenReminder(reminderId)).toHaveProperty("success", true);
    expect((await getReminders())[0].completed).toBe(false);
    const edited = await db.query.cases.findFirst({ where: (row, { eq }) => eq(row.id, caseId) });
    expect(edited).toMatchObject({ fee: "9876.54", preferredPaymentMethod: "CASH", title: "Título actualizado", status: "SUSPENDED" });
  });

  it("refuses financial writes, rich reads and deletion without changing data", async () => {
    for (const field of ["fee", "preferredPaymentMethod"]) {
      expect(await createCase(form({ clientId, title: "Prohibido", [field]: "" }))).toHaveProperty("error");
      expect(await updateCase(caseId, form({ clientId, title: "Prohibido", [field]: "" }))).toHaveProperty("error");
    }
    await expect(getClient(clientId)).rejects.toThrow();
    await expect(getCase(caseId)).rejects.toThrow();
    await expect(deleteClient(clientId)).rejects.toThrow();
    await expect(deleteReminder(reminderId)).rejects.toThrow();
    expect(await db.query.clients.findMany()).toHaveLength(2);
    expect(await db.query.cases.findMany()).toHaveLength(2);
    expect(await db.query.reminders.findMany()).toHaveLength(2);
    expect(await db.query.activityLog.findMany()).toHaveLength(0);
  });

  it("refuses other-office updates and forged relations", async () => {
    expect(await updateClient(otherClientId, form({ name: "Prohibido" }))).toHaveProperty("error");
    expect(await updateCase(otherCaseId, form({ clientId, title: "Prohibido" }))).toHaveProperty("error");
    expect(await updateCaseStatus(otherCaseId, "CLOSED")).toHaveProperty("error");
    expect(await createCase(form({ clientId: otherClientId, title: "Prohibido" }))).toHaveProperty("error");
    expect(await updateCase(caseId, form({ clientId: otherClientId, title: "Prohibido" }))).toHaveProperty("error");
    expect(await createReminder(form({ caseId: otherCaseId, title: "Prohibido", reminderDate: "2099-01-01" }))).toHaveProperty("error");
    expect(await updateReminder(otherReminderId, form({ title: "Prohibido", reminderDate: "2099-01-01" }))).toHaveProperty("error");
    expect(await completeReminder(otherReminderId)).toHaveProperty("error");
    expect(await reopenReminder(otherReminderId)).toHaveProperty("error");
    expect(await db.query.activityLog.findMany()).toHaveLength(0);
  });

  it("keeps the owner's financial reads, edits and deletion working", async () => {
    state.actor = owner;
    state.role = "ADMIN";
    expect(await updateCase(caseId, form({ clientId, title: "Caso dueña", fee: "111.11", preferredPaymentMethod: "TRANSFER" }))).toHaveProperty("success", true);
    expect(await getCase(caseId)).toHaveProperty("fee", "111.11");
    expect(await getClient(clientId)).toHaveProperty("financeSummary");
    expect(await deleteReminder(reminderId)).toHaveProperty("success", true);
    expect(await deleteClient(clientId)).toHaveProperty("success", true);
    expect(await db.query.clients.findMany()).toHaveLength(1);
    expect(await db.query.cases.findMany()).toHaveLength(1);
  });
});
