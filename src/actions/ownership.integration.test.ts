import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sql } from "postgres";
import { db } from "@/db";
import { cases, clients, reminders } from "@/db/schema";
import { createCase, getCase, getCases, updateCase } from "./cases";
import { createReminder, getReminders, updateReminder } from "./reminders";

const localUrl = process.env.AUTH_TEST_DATABASE_URL;
const state = vi.hoisted(() => ({ userId: "", connection: undefined as Sql | undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: state.userId } } }) },
}) }));
vi.mock("@/db", async () => {
  const target = process.env.AUTH_TEST_DATABASE_URL;
  if (!target) return { db: {} };
  const url = new URL(target);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/artieda_authorization_test") {
    throw new Error("Only the isolated authorization test database is permitted");
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("@/db/schema");
  state.connection = postgres(target, { max: 2, prepare: false, onnotice: () => {} });
  return { db: drizzle(state.connection, { schema }) };
});

describe.skipIf(!localUrl)("ownership enforced by real server actions", () => {
  const owner = randomUUID(), outsider = randomUUID();
  const ownClient = randomUUID(), otherClient = randomUUID();
  const ownCase = randomUUID(), otherCase = randomUUID(), ownReminder = randomUUID();
  const form = (values: Record<string, string>) => {
    const result = new FormData();
    for (const [key, value] of Object.entries(values)) result.set(key, value);
    return result;
  };
  beforeAll(() => { state.userId = owner; });
  beforeEach(async () => {
    // This database is dedicated to this suite and contains synthetic fixtures only.
    await state.connection!.unsafe("TRUNCATE public.clients, public.reminders, public.activity_log CASCADE");
    await db.insert(clients).values([
      { id: ownClient, userId: owner, name: "Own synthetic client" },
      { id: otherClient, userId: outsider, name: "Private synthetic client" },
    ]);
    await db.insert(cases).values([
      { id: ownCase, userId: owner, clientId: ownClient, title: "Own case" },
      { id: otherCase, userId: outsider, clientId: otherClient, title: "Private case" },
    ]);
    await db.insert(reminders).values({
      id: ownReminder, userId: owner, clientId: ownClient, caseId: ownCase,
      title: "Synthetic reminder", reminderDate: new Date("2099-01-01T12:00:00Z"),
    });
  });
  afterAll(async () => { await state.connection?.end(); });

  it("rejects creating a case for somebody else's client", async () => {
    const result = await createCase(form({ clientId: otherClient, title: "Invalid relation" }));
    expect(result).toHaveProperty("error");
    expect(await db.query.cases.findMany()).toHaveLength(2);
  });
  it("rejects changing a case to somebody else's client", async () => {
    expect(await updateCase(ownCase, form({ clientId: otherClient, title: "Invalid relation" }))).toHaveProperty("error");
    expect((await db.query.cases.findFirst({ where: (row, { eq }) => eq(row.id, ownCase) }))?.clientId).toBe(ownClient);
  });
  it("allows an owned client", async () => {
    expect(await createCase(form({ clientId: ownClient, title: "Valid case" }))).toHaveProperty("success", true);
  });
  it("does not expose a legacy case linked to an unrelated owner", async () => {
    const invalidId = randomUUID();
    await db.insert(cases).values({ id: invalidId, userId: owner, clientId: otherClient, title: "Legacy invalid case" });
    expect(await getCase(invalidId)).toBeNull();
    expect((await getCases()).map(row => row.id)).not.toContain(invalidId);
  });
  it.each(["clientId", "caseId"])("rejects a reminder linked to somebody else's %s", async field => {
    const values = { title: "Invalid reminder", reminderDate: "2099-01-01", [field]: field === "clientId" ? otherClient : otherCase };
    expect(await createReminder(form(values))).toHaveProperty("error");
    expect(await db.query.reminders.findMany()).toHaveLength(1);
  });
  it("rejects changing a reminder to an unrelated owner", async () => {
    expect(await updateReminder(ownReminder, form({ title: "Invalid", reminderDate: "2099-01-01", caseId: otherCase }))).toHaveProperty("error");
  });
  it("does not report a successful update to an absent reminder", async () => {
    expect(await updateReminder(randomUUID(), form({ title: "Missing", reminderDate: "2099-01-01" }))).toHaveProperty("error");
  });
  it("does not expose legacy cross-owner reminder relations", async () => {
    const invalidId = randomUUID();
    await db.insert(reminders).values({ id: invalidId, userId: owner, clientId: otherClient, title: "Legacy invalid reminder", reminderDate: new Date("2099-01-01T12:00:00Z") });
    expect((await getReminders()).map(row => row.id)).not.toContain(invalidId);
  });
});
