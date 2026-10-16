import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sql } from "postgres";
import { db } from "@/db";
import { cases, charges, clients, clientSavedSignatures, payments, reminders, signatureDocuments, signatureEvents, signatureRecipients, signatureRequests } from "@/db/schema";
import { createCase, getCase, getCases, updateCase } from "./cases";
import { getClient, getClients } from "./clients";
import { createReminder, getReminders, updateReminder } from "./reminders";

const localUrl = process.env.AUTH_TEST_DATABASE_URL;
const state = vi.hoisted(() => ({ userId: "", connection: undefined as Sql | undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: state.userId } } }) },
}) }));
vi.mock("@/lib/workspace-access", () => ({
  getWorkspaceAccess: async () => ({ actorUserId: state.userId, ownerUserId: state.userId, role: "ADMIN" }),
  requireAdminAccess: async () => ({ actorUserId: state.userId, ownerUserId: state.userId, role: "ADMIN" }),
}));
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

  it("keeps client financial summaries scoped through every nested relation", async () => {
    const ownCharge = randomUUID();
    await db.insert(cases).values({ userId: outsider, clientId: ownClient, title: "FOREIGN_CASE", fee: "9876.54" });
    await db.insert(charges).values([
      { id: ownCharge, userId: owner, caseId: ownCase, description: "Owned charge", amountTotal: "100" },
      { userId: outsider, caseId: ownCase, description: "FOREIGN_CHARGE", amountTotal: "888.88" },
    ]);
    await db.insert(payments).values([
      { userId: owner, chargeId: ownCharge, amount: "10", paymentDate: "2026-10-01" },
      { userId: outsider, chargeId: ownCharge, amount: "20", paymentDate: "2026-10-01", notes: "FOREIGN_PAYMENT" },
    ]);
    await db.insert(reminders).values({ userId: outsider, clientId: ownClient, title: "FOREIGN_REMINDER", reminderDate: new Date("2099-01-01T12:00:00Z") });
    await db.insert(clientSavedSignatures).values({ userId: outsider, clientId: ownClient, storagePath: "FOREIGN_SIGNATURE", sha256: "synthetic", consentedAt: new Date() });

    const list = await getClients();
    const detail = await getClient(ownClient);
    expect(list).toHaveLength(1);
    for (const result of [list[0], detail]) {
      expect(result?.cases.map(row => row.id)).toEqual([ownCase]);
      expect(result?.financeSummary).toMatchObject({ expected: 100, collected: 10, balance: 90, openReminders: 1 });
      expect(JSON.stringify(result)).not.toContain("FOREIGN_");
    }
    expect(detail?.savedSignature).toBeNull();
    expect(detail?.hasSavedSignature).toBe(false);
    expect(detail?.paymentTimeline).toHaveLength(1);
    expect(detail?.upcomingCharges).toHaveLength(1);
  });

  it.each(["request", "client", "case", "document", "recipient", "recipient-client", "event", "none"])("validates the entire signature graph in client and case details (%s)", async foreign => {
    const requestId = randomUUID();
    const future = new Date("2099-01-01T12:00:00Z");
    await db.insert(signatureRequests).values({ id: requestId, userId: foreign === "request" ? outsider : owner,
      clientId: foreign === "client" ? otherClient : ownClient, caseId: foreign === "case" ? otherCase : ownCase,
      subject: "Synthetic request", recipientEmail: "synthetic@example.test", tokenHash: randomUUID(), tokenExpiresAt: future });
    await db.insert(signatureRecipients).values({ userId: owner, signatureRequestId: requestId, clientId: ownClient,
      firstName: "Synthetic", email: "synthetic@example.test", tokenHash: randomUUID(), tokenExpiresAt: future });
    if (foreign === "recipient" || foreign === "recipient-client") {
      await db.insert(signatureRecipients).values({ userId: foreign === "recipient" ? outsider : owner,
        signatureRequestId: requestId, clientId: foreign === "recipient-client" ? otherClient : ownClient,
        firstName: "Foreign", email: "foreign@example.test", tokenHash: randomUUID(), tokenExpiresAt: future });
    }
    await db.insert(signatureDocuments).values({ userId: foreign === "document" ? outsider : owner, signatureRequestId: requestId,
      originalFileName: "synthetic.pdf", originalStoragePath: "synthetic/path.pdf", originalSha256: "synthetic",
      placementX: "0.1", placementY: "0.1", placementWidth: "0.1", placementHeight: "0.1" });
    await db.insert(signatureEvents).values({ userId: foreign === "event" ? outsider : owner, signatureRequestId: requestId, type: "created" });
    const detail = await getClient(ownClient);
    expect(detail?.recentSignatureRequests).toHaveLength(foreign === "none" ? 1 : 0);
    expect(detail?.signatureSummary.total).toBe(foreign === "none" ? 1 : 0);
    const caseDetail = await getCase(ownCase);
    expect(caseDetail?.recentSignatureRequests).toHaveLength(foreign === "none" ? 1 : 0);
    expect(caseDetail?.signatureSummary.total).toBe(foreign === "none" ? 1 : 0);
  });
});
