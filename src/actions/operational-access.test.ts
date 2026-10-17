import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCase, getCase, getCaseRecord, getCases, updateCase, updateCaseStatus } from "./cases";
import { createClientAction, deleteClient, getClient, getClients, updateClient } from "./clients";
import { completeReminder, createReminder, deleteReminder, getReminders, reopenReminder, updateReminder } from "./reminders";
import { getOperationalCase, getOperationalCases, getOperationalClient, getOperationalClients } from "./operational";

const mocks = vi.hoisted(() => ({
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
  clientFirst: vi.fn(), clientMany: vi.fn(), caseFirst: vi.fn(), caseMany: vi.fn(),
  reminderFirst: vi.fn(), reminderMany: vi.fn(), workspaceMany: vi.fn(), insert: vi.fn(), values: vi.fn(),
  returning: vi.fn(), mutationReturning: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), remove: vi.fn(), log: vi.fn(),
}));
const owner = "10000000-0000-4000-8000-000000000001";
const actor = "10000000-0000-4000-8000-000000000002";
const clientId = "10000000-0000-4000-8000-000000000003";
const caseId = "10000000-0000-4000-8000-000000000004";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/activity-log", () => ({ logActivity: mocks.log }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: actor } } }) },
}) }));
vi.mock("@/lib/workspace-access", () => ({
  getWorkspaceAccess: async () => ({ actorUserId: mocks.role === "ADMIN" ? owner : actor, ownerUserId: owner, displayName: mocks.role === "ADMIN" ? "Victoria" : "Brisa", role: mocks.role }),
  requireAdminAccess: async () => {
    if (mocks.role !== "ADMIN") throw new Error("Acceso denegado");
    return { actorUserId: owner, ownerUserId: owner, role: mocks.role };
  },
}));
vi.mock("@/db", () => ({ db: {
  query: {
    clients: { findFirst: mocks.clientFirst, findMany: mocks.clientMany },
    cases: { findFirst: mocks.caseFirst, findMany: mocks.caseMany },
    reminders: { findFirst: mocks.reminderFirst, findMany: mocks.reminderMany },
    workspaceMembers: { findMany: mocks.workspaceMany },
  }, insert: mocks.insert, update: mocks.update, delete: mocks.remove,
} }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const client = {
  id: clientId, userId: owner, name: "Cliente compartido", taxId: null,
  email: null, phone: null, address: null, languages: null,
  notes: "Texto compartido con importe 500", createdAt: new Date(), updatedAt: new Date(),
};
const currentCase = {
  id: caseId, userId: owner, clientId, title: "Caso compartido", description: null,
  status: "ACTIVE", priority: "MEDIUM", fee: "555.50", preferredPaymentMethod: "TRANSFER",
  startDate: null, endDate: null, createdAt: new Date(), updatedAt: new Date(), client,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "COLLABORATOR";
  mocks.clientFirst.mockResolvedValue(client);
  mocks.clientMany.mockResolvedValue([]);
  mocks.caseFirst.mockResolvedValue(currentCase);
  mocks.caseMany.mockResolvedValue([]);
  mocks.reminderFirst.mockResolvedValue({ id: "reminder", userId: owner, assigneeUserId: actor, completed: false });
  mocks.reminderMany.mockResolvedValue([]);
  mocks.workspaceMany.mockResolvedValue([{ userId: actor, displayName: "Brisa" }, { userId: owner, displayName: "Victoria" }]);
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: caseId }]);
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.mutationReturning });
  mocks.mutationReturning.mockResolvedValue([{ id: "reminder" }]);
  mocks.remove.mockReturnValue({ where: mocks.where });
});

describe("operational role boundaries", () => {
  it.each([
    ["clients", () => getClients()], ["client", () => getClient(clientId)],
    ["cases", () => getCases()], ["case", () => getCase(caseId)],
    ["case edit record", () => getCaseRecord(caseId)],
  ])("denies the rich financial %s read before querying", async (_name, read) => {
    await expect(read()).rejects.toThrow();
    expect(mocks.clientFirst).not.toHaveBeenCalled();
    expect(mocks.clientMany).not.toHaveBeenCalled();
    expect(mocks.caseFirst).not.toHaveBeenCalled();
    expect(mocks.caseMany).not.toHaveBeenCalled();
  });

  it.each(["fee", "preferredPaymentMethod"])("refuses collaborator %s fields even when empty", async key => {
    const input = form({ clientId, title: "Nuevo", [key]: "" });
    expect(await createCase(input)).toHaveProperty("error");
    expect(await updateCase(caseId, input)).toHaveProperty("error");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves existing financial fields on collaborator edits and records the actor", async () => {
    expect(await updateCase(caseId, form({ clientId, title: "Corregido" }))).toHaveProperty("success", true);
    const change = mocks.set.mock.calls[0][0];
    expect(change).not.toHaveProperty("fee");
    expect(change).not.toHaveProperty("preferredPaymentMethod");
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ userId: owner, actorUserId: actor }));
  });

  it("allows owner financial changes", async () => {
    mocks.role = "ADMIN";
    expect(await updateCase(caseId, form({ clientId, title: "Corregido", fee: "100", preferredPaymentMethod: "CASH" }))).toHaveProperty("success", true);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ fee: "100", preferredPaymentMethod: "CASH" }));
  });

  it("creates shared records under the office owner with the collaborator as actor", async () => {
    expect(await createClientAction(form({ name: "Nuevo" }))).toHaveProperty("success", true);
    expect(await createCase(form({ clientId, title: "Nuevo" }))).toHaveProperty("success", true);
    expect(await createReminder(form({ title: "Nuevo", reminderDate: "2099-01-01" }))).toHaveProperty("success", true);
    for (const call of mocks.values.mock.calls) expect(call[0]).toHaveProperty("userId", owner);
    expect(mocks.values.mock.calls.at(-1)?.[0]).toMatchObject({ createdByUserId: actor, assigneeUserId: actor });
    expect(mocks.log).toHaveBeenCalledTimes(3);
    for (const call of mocks.log.mock.calls) expect(call[0]).toMatchObject({ userId: owner, actorUserId: actor });
  });

  it.each(["INVALID", undefined, null])("rejects invalid status %s before an update", async status => {
    expect(await updateCaseStatus(caseId, status as "ACTIVE")).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid reminder date before attempting an insert", async () => {
    expect(await createReminder(form({ title: "Sin fecha válida", reminderDate: "invalid" }))).toHaveProperty("error");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("denies permanent client and reminder deletion before querying", async () => {
    await expect(deleteClient(clientId)).rejects.toThrow();
    await expect(deleteReminder("reminder")).rejects.toThrow();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.reminderFirst).not.toHaveBeenCalled();
  });

  it("does not report successful updates for missing or unrelated clients", async () => {
    mocks.clientFirst.mockResolvedValue(undefined);
    expect(await updateClient(clientId, form({ name: "No existe" }))).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns reminder context without financial case fields", async () => {
    mocks.reminderMany.mockResolvedValue([{
      id: "reminder", userId: owner, createdByUserId: actor, assigneeUserId: actor, title: "Texto existente 500", case: currentCase, client,
    }]);
    const result = await getReminders();
    expect(result[0].case).not.toHaveProperty("fee");
    expect(result[0].case).not.toHaveProperty("preferredPaymentMethod");
    expect(result[0].title).toBe("Texto existente 500");
  });

  it("uses a neutral creator label when the original account no longer exists", async () => {
    mocks.reminderMany.mockResolvedValue([{
      id: "reminder", userId: owner, createdByUserId: null, assigneeUserId: actor, title: "Histórica", case: null, client: null,
    }]);
    expect((await getReminders())[0].creatorName).toBe("Usuario anterior");
  });

  it("hides Victoria's private tasks from Brisa and rejects direct mutations", async () => {
    const privateReminder = { id: "private", userId: owner, createdByUserId: owner, assigneeUserId: null, title: "Solo Victoria", case: null, client: null, completed: false };
    mocks.reminderMany.mockResolvedValue([privateReminder]);
    mocks.reminderFirst.mockResolvedValue(privateReminder);
    expect(await getReminders()).toEqual([]);
    expect(await updateReminder("private", form({ title: "Intento", reminderDate: "2099-01-01" }))).toHaveProperty("error");
    expect(await completeReminder("private")).toHaveProperty("error");
    expect(await reopenReminder("private")).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("lets Victoria assign a task to Brisa", async () => {
    mocks.role = "ADMIN";
    expect(await createReminder(form({ title: "Para Brisa", reminderDate: "2099-01-01", assigneeUserId: actor }))).toHaveProperty("success", true);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: owner, assigneeUserId: actor }));
  });

  it("does not report or log a task update when its assignment changed concurrently", async () => {
    mocks.mutationReturning.mockResolvedValueOnce([]);
    expect(await updateReminder("reminder", form({ title: "Intento", reminderDate: "2099-01-01" }))).toHaveProperty("error");
    expect(mocks.log).not.toHaveBeenCalled();
  });

  it("projects all operational reads, keeping agreed text and excluding nested financial data", async () => {
    const withPrivateFields = {
      ...currentCase, charges: [{ amountTotal: "100" }], balance: 100,
      reminders: [], client: { ...client, futurePrivateField: "secret" },
    };
    mocks.caseFirst.mockResolvedValue(withPrivateFields);
    mocks.caseMany.mockResolvedValue([withPrivateFields]);
    mocks.clientFirst.mockResolvedValue({ ...client, cases: [withPrivateFields], reminders: [], financeSummary: { balance: 100 } });
    mocks.clientMany.mockResolvedValue([{ ...client, cases: [withPrivateFields], reminders: [], financeSummary: { balance: 100 } }]);
    const results = await Promise.all([
      getOperationalClient(clientId), getOperationalClients(),
      getOperationalCase(caseId), getOperationalCases(),
    ]);
    const serialized = JSON.stringify(results);
    for (const field of ["fee", "preferredPaymentMethod", "charges", "balance", "financeSummary", "futurePrivateField"]) {
      expect(serialized).not.toContain(`"${field}":`);
    }
    expect(serialized).toContain("Texto compartido con importe 500");
    expect(serialized).toContain("Caso compartido");
  });

  it("adds responsible and creator names to tasks nested in clients", async () => {
    mocks.clientFirst.mockResolvedValue({
      ...client,
      cases: [],
      reminders: [{ id: "reminder", userId: owner, createdByUserId: owner, assigneeUserId: actor, title: "Seguimiento", description: null, reminderDate: new Date(), priority: "MEDIUM", completed: false, completedAt: null, createdAt: new Date(), updatedAt: new Date() }],
    });
    const result = await getOperationalClient(clientId);
    expect(result?.reminders[0]).toMatchObject({ assigneeName: "Brisa", creatorName: "Victoria" });
  });

  it("hides legacy cases linked to another office", async () => {
    const invalidCase = { ...currentCase, client: { ...client, userId: actor }, reminders: [] };
    mocks.caseFirst.mockResolvedValue(invalidCase);
    mocks.caseMany.mockResolvedValue([invalidCase]);
    expect(await getOperationalCase(caseId)).toBeNull();
    expect(await getOperationalCases()).toEqual([]);
  });
});
