import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { sendSignatureRequestEmail } from "../lib/signature-email";

const harness = vi.hoisted(() => ({
  database: undefined as unknown,
  userId: "00000000-0000-4000-8000-000000000001",
  ownerUserId: null as string | null,
  role: "ADMIN" as "ADMIN" | "COLLABORATOR",
  objects: new Map<string, Buffer>(),
  failSignedUpload: false,
  uploads: [] as string[],
}));
vi.mock("../db", () => ({ get db() { return harness.database; } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: harness.userId } } }) } }) }));
vi.mock("../lib/workspace-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/workspace-access")>();
  const access = () => ({ actorUserId: harness.userId, ownerUserId: harness.ownerUserId ?? harness.userId, role: harness.role });
  return { ...actual, getWorkspaceAccess: async () => access(), requireAdminAccess: async () => {
    if (harness.role !== "ADMIN") throw new actual.WorkspaceAccessError("ACCESS_DENIED");
    return access();
  } };
});
vi.mock("../lib/signature-email", () => ({
  sendSignatureRequestEmail: vi.fn(async () => undefined),
  buildSignedDocumentCopyEmail: vi.fn(() => ({})),
  buildRecipientSignatureEmail: vi.fn(({ token }) => ({ signingUrl: `https://example.invalid/${token}` })),
}));
vi.mock("../lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({
  upload: async (path: string, bytes: Buffer) => {
    harness.uploads.push(path);
    if (harness.failSignedUpload && path.includes("/signed/")) return { error: { message: "Storage unavailable" } };
    harness.objects.set(path, Buffer.from(bytes));
    return { error: null };
  },
  download: async (path: string) => {
    const bytes = harness.objects.get(path);
    return bytes ? { data: new Blob([new Uint8Array(bytes)]), error: null } : { data: null, error: { message: "Not found" } };
  },
  remove: async (paths: string[]) => { paths.forEach((path) => harness.objects.delete(path)); return { error: null }; },
}) } }) }));

const testUrl = process.env.SIGNATURE_TEST_DATABASE_URL;
if (testUrl) {
  const parsed = new URL(testUrl);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.pathname !== "/artieda_signatures_test") {
    throw new Error("Signature integration tests require the dedicated local test database");
  }
}
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6D3VwAAAABJRU5ErkJggg==", "base64");
const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const signatureForm = (png = tinyPng) => { const form = new FormData(); form.set("signatureDataUrl", `data:image/png;base64,${png.toString("base64")}`); return form; };

describe.skipIf(!testUrl)("signature safety against local PostgreSQL and simulated external services", () => {
  let client: ReturnType<typeof postgres>;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  let publicActions: typeof import("./public-signatures");
  let actions: typeof import("./signatures");
  let signatureCron: typeof import("../app/api/cron/signatures/route");
  let emailOpen: typeof import("../app/api/signatures/email-open/[token]/route");
  const requestIds: string[] = [];
  const clientIds: string[] = [];

  beforeAll(async () => {
    client = postgres(testUrl!, { max: 5, prepare: false });
    database = drizzle(client, { schema });
    harness.database = database;
    publicActions = await import("./public-signatures");
    actions = await import("./signatures");
    signatureCron = await import("../app/api/cron/signatures/route");
    emailOpen = await import("../app/api/signatures/email-open/[token]/route");
  });
  beforeEach(() => {
    vi.mocked(sendSignatureRequestEmail).mockReset().mockResolvedValue(undefined as never);
    harness.objects.clear(); harness.uploads = []; harness.failSignedUpload = false;
    harness.userId = "00000000-0000-4000-8000-000000000001";
    harness.ownerUserId = null; harness.role = "ADMIN";
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    for (const id of requestIds) {
      await database.delete(schema.signatureRequests).where(eq(schema.signatureRequests.id, id));
      await database.delete(schema.activityLog).where(eq(schema.activityLog.entityId, id));
    }
    for (const id of clientIds) await database.delete(schema.clients).where(eq(schema.clients.id, id));
    await client?.end();
  });

  async function seed(status: typeof schema.signatureRequests.$inferSelect.status = "SENT", count = 1) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 86400000);
    const signedAt = status === "SIGNED" ? new Date("2026-01-01T12:00:00Z") : null;
    const [request] = await database.insert(schema.signatureRequests).values({
      userId: harness.userId, subject: "Synthetic signature test", recipientEmail: "test@example.invalid",
      tokenHash: hash(token), tokenExpiresAt: expires, status, signedAt,
      sentAt: ["DRAFT", "READY"].includes(status) ? null : new Date(),
    }).returning();
    requestIds.push(request.id);
    const pdf = await PDFDocument.create(); pdf.addPage([600, 800]);
    const bytes = Buffer.from(await pdf.save());
    const originalPath = `${harness.userId}/signature-requests/${request.id}/original/original.pdf`;
    harness.objects.set(originalPath, bytes);
    const [document] = await database.insert(schema.signatureDocuments).values({
      userId: harness.userId, signatureRequestId: request.id, originalFileName: "original.pdf",
      originalStoragePath: originalPath, originalSha256: hash(bytes),
      placementX: "0.1", placementY: "0.2", placementWidth: "0.2", placementHeight: "0.1",
    }).returning();
    const tokens = [];
    const recipients = [];
    for (let index = 0; index < count; index++) {
      const recipientToken = index === 0 ? token : randomUUID(); tokens.push(recipientToken);
      const [recipient] = await database.insert(schema.signatureRecipients).values({
        userId: harness.userId, signatureRequestId: request.id, firstName: "Synthetic", email: `test${index}@example.invalid`,
        status: status === "SIGNED" ? "SIGNED" : status === "READY" || status === "DRAFT" ? status : "SENT",
        tokenHash: hash(recipientToken), tokenExpiresAt: expires, signedAt, sortOrder: index,
      }).returning();
      recipients.push(recipient);
      await database.insert(schema.signaturePlacements).values({
        userId: harness.userId, signatureRequestId: request.id, recipientId: recipient.id,
        pageNumber: 1, placementX: "0.1", placementY: "0.2", placementWidth: "0.2", placementHeight: "0.1",
      });
    }
    return { request, document, recipients, tokens, bytes };
  }
  async function read(id: string) {
    return (await database.query.signatureRequests.findFirst({ where: eq(schema.signatureRequests.id, id), with: { document: true, recipients: true, events: true } }))!;
  }

  async function seedCase(userId = harness.userId) {
    const [customer] = await database.insert(schema.clients).values({ userId, name: "Synthetic client", email: "test@example.invalid" }).returning();
    clientIds.push(customer.id);
    const [matter] = await database.insert(schema.cases).values({ userId, clientId: customer.id, title: "Synthetic case", fee: "88000.00", preferredPaymentMethod: "PRIVATE_METHOD" }).returning();
    return { customer, matter };
  }
  function useCollaborator() {
    harness.ownerUserId = harness.userId; harness.userId = "00000000-0000-4000-8000-000000000003"; harness.role = "COLLABORATOR";
  }
  function draftForm(clientId: string, caseId: string) {
    const form = new FormData();
    form.set("subject", "Synthetic collaborator draft"); form.set("message", "Shared text can mention $88000"); form.set("caseId", caseId);
    form.set("recipients[0].email", "test@example.invalid"); form.set("recipients[0].firstName", "Synthetic"); form.set("recipients[0].clientId", clientId);
    form.set("recipients[0].placements[0].pageNumber", "1"); form.set("recipients[0].placements[0].x", "0.1"); form.set("recipients[0].placements[0].y", "0.1");
    form.set("recipients[0].placements[0].width", "0.2"); form.set("recipients[0].placements[0].height", "0.1");
    return form;
  }

  it("returns real shared office signatures without nested case financial columns", async () => {
    const { customer, matter } = await seedCase(); const fixture = await seed("READY");
    await database.update(schema.signatureRequests).set({ clientId: customer.id, caseId: matter.id }).where(eq(schema.signatureRequests.id, fixture.request.id));
    useCollaborator();
    const detail = await actions.getSignatureRequest(fixture.request.id);
    expect(detail?.case).toMatchObject({ id: matter.id, title: matter.title });
    expect(detail?.case).not.toHaveProperty("fee"); expect(detail?.case).not.toHaveProperty("preferredPaymentMethod");
    const listItem = (await actions.getSignatureRequests()).find((request) => request.id === fixture.request.id);
    expect(listItem?.case).toEqual(detail?.case);
    const options = await actions.getSignatureFormOptions();
    expect(options.cases.find((item) => item.id === matter.id)).toEqual({ id: matter.id, title: matter.title, clientId: customer.id, clientName: customer.name });
    const { getAuthenticatedSignatureRequest } = await import("../app/api/signatures/[id]/downloads");
    const download = await getAuthenticatedSignatureRequest(fixture.request.id);
    expect(download).toMatchObject({ userId: harness.ownerUserId, actorUserId: harness.userId, request: { case: detail?.case } });
  });

  it("creates, uploads and sends on behalf of the office while recording the collaborator", async () => {
    const { customer, matter } = await seedCase();
    const source = await seed("READY"); useCollaborator();
    const draft = await actions.createSignatureDraft(draftForm(customer.id, matter.id));
    expect(draft).toHaveProperty("success", true);
    if (!draft.signatureRequestId) throw new Error("Missing synthetic draft");
    requestIds.push(draft.signatureRequestId);
    const form = new FormData(); form.set("document", new File([new Uint8Array(source.bytes)], "collaborator.pdf", { type: "application/pdf" }));
    expect(await actions.uploadSignatureDocument(draft.signatureRequestId, form)).toHaveProperty("success", true);
    expect(await actions.updateSignaturePlacement(draft.signatureRequestId, { pageNumber: 1, x: .1, y: .1, width: .2, height: .1 })).toHaveProperty("success", true);
    expect(await actions.sendSignatureRequest(draft.signatureRequestId)).toHaveProperty("success", true);
    const after = await read(draft.signatureRequestId);
    expect(after.userId).toBe(harness.ownerUserId); expect(after.recipients[0].userId).toBe(harness.ownerUserId);
    expect(after.document?.originalStoragePath).toMatch(new RegExp(`^${harness.ownerUserId}/signature-requests/${after.id}/original/`));
    expect(after.events.every((event) => (event.metadata as { actorUserId: string }).actorUserId === harness.userId)).toBe(true);
    const audits = await database.query.activityLog.findMany({ where: eq(schema.activityLog.entityId, after.id) });
    expect(audits.length).toBeGreaterThan(0);
    expect(audits.every((event) => event.userId === harness.ownerUserId && event.actorUserId === harness.userId)).toBe(true);
  });

  it("a collaborator cannot permanently delete an office request", async () => {
    const fixture = await seed("READY"); useCollaborator();
    await expect(actions.deleteSignatureRequest(fixture.request.id)).rejects.toHaveProperty("code", "ACCESS_DENIED");
    expect((await read(fixture.request.id)).status).toBe("READY");
  });

  it("a collaborator cannot read or attach another office's case or client", async () => {
    const foreign = await seedCase("00000000-0000-4000-8000-000000000002");
    const own = await seedCase(); useCollaborator();
    expect(await actions.createSignatureDraft(draftForm(foreign.customer.id, own.matter.id))).toHaveProperty("error", "Cliente no encontrado");
    expect(await actions.createSignatureDraft(draftForm(own.customer.id, foreign.matter.id))).toHaveProperty("error", "Caso no encontrado");
    const options = await actions.getSignatureFormOptions();
    expect(options.clients.some((row) => row.id === foreign.customer.id)).toBe(false);
    expect(options.cases.some((row) => row.id === foreign.matter.id)).toBe(false);
  });

  it("opening an expired link preserves a completed signature and its completion date", async () => {
    const fixture = await seed("SIGNED");
    await database.update(schema.signatureRecipients).set({ tokenExpiresAt: new Date(0) }).where(eq(schema.signatureRecipients.id, fixture.recipients[0].id));
    await publicActions.getPublicSignatureRequest(fixture.tokens[0]);
    const after = await read(fixture.request.id);
    expect(after.status).toBe("SIGNED"); expect(after.recipients[0].status).toBe("SIGNED");
    expect(after.signedAt).toEqual(fixture.request.signedAt); expect(after.events).toHaveLength(0);
  });
  it.each(["SENT", "PARTIALLY_SIGNED", "EXPIRED", "CANCELLED", "SIGNED"] as const)("cannot replace a %s document", async (status) => {
    const fixture = await seed(status);
    const form = new FormData(); form.set("document", new File([new Uint8Array(fixture.bytes)], "replacement.pdf", { type: "application/pdf" }));
    expect(await actions.uploadSignatureDocument(fixture.request.id, form)).toHaveProperty("error");
    expect((await read(fixture.request.id)).document?.originalFileName).toBe("original.pdf");
    expect(harness.uploads).toHaveLength(0);
  });
  it("rejects invalid PNG before storing anything or changing status", async () => {
    const fixture = await seed();
    await expect(publicActions.submitPublicSignature(fixture.tokens[0], signatureForm(Buffer.from("invalid")))).resolves.toHaveProperty("error");
    const after = await read(fixture.request.id);
    expect(after.status).toBe("SENT"); expect(after.recipients[0].status).toBe("SENT"); expect(harness.uploads).toHaveLength(0);
  });
  it("rejects oversized PNG dimensions before decoding or persisting", async () => {
    const fixture = await seed(); const malicious = Buffer.from(tinyPng); malicious.writeUInt32BE(100000, 16);
    await expect(publicActions.submitPublicSignature(fixture.tokens[0], signatureForm(malicious))).resolves.toHaveProperty("error");
    expect(harness.uploads).toHaveLength(0);
  });
  it("storage failure rolls back final state and permits an idempotent retry", async () => {
    const fixture = await seed(); harness.failSignedUpload = true;
    expect(await publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())).toHaveProperty("error");
    expect((await read(fixture.request.id)).status).toBe("SENT");
    harness.failSignedUpload = false;
    expect(await publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())).toHaveProperty("success", true);
    const after = await read(fixture.request.id);
    expect(after.status).toBe("SIGNED"); expect(after.document?.signedStoragePath).toBeTruthy();
    expect(after.document?.originalStoragePath).toBe(fixture.document.originalStoragePath);
    expect(harness.objects.get(fixture.document.originalStoragePath)).toEqual(fixture.bytes);
    expect(after.events.filter((event) => event.type === "signed")).toHaveLength(1);
    const uploads = harness.uploads.length;
    expect(await publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())).toHaveProperty("success", true);
    expect(harness.uploads).toHaveLength(uploads);
  });
  it("rejects an original document whose bytes no longer match the accepted hash", async () => {
    const fixture = await seed(); harness.objects.set(fixture.document.originalStoragePath, Buffer.from("tampered"));
    await expect(publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())).resolves.toHaveProperty("error");
    expect((await read(fixture.request.id)).recipients[0].status).toBe("SENT");
  });

  it("cannot use a forged original object path even when the attacker supplies its correct hash", async () => {
    const fixture = await seed();
    const foreignPath = `00000000-0000-4000-8000-000000000002/signature-requests/${randomUUID()}/original/private.pdf`;
    harness.objects.set(foreignPath, fixture.bytes);
    await database.update(schema.signatureDocuments).set({ originalStoragePath: foreignPath })
      .where(eq(schema.signatureDocuments.id, fixture.document.id));
    expect(await publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())).toHaveProperty("error");
    expect((await read(fixture.request.id)).recipients[0].status).toBe("SENT");
    expect(harness.uploads).toHaveLength(0);
  });

  it("cannot import another owner's stored signature into an otherwise owned request", async () => {
    const fixture = await seed("SENT", 2);
    const foreignPath = `00000000-0000-4000-8000-000000000002/signature-requests/${randomUUID()}/signature/private.png`;
    harness.objects.set(foreignPath, tinyPng);
    await database.update(schema.signatureRecipients).set({ status: "SIGNED", signedAt: new Date(),
      signatureStoragePath: foreignPath, signatureSha256: hash(tinyPng) })
      .where(eq(schema.signatureRecipients.id, fixture.recipients[0].id));
    expect(await publicActions.submitPublicSignature(fixture.tokens[1], signatureForm())).toHaveProperty("error");
    expect((await read(fixture.request.id)).recipients.find(
      (recipient) => recipient.id === fixture.recipients[1].id
    )?.status).toBe("SENT");
    expect(harness.uploads).toHaveLength(0);
  });
  it("concurrent submissions of the same token produce only one acceptance and artifact", async () => {
    const fixture = await seed();
    const results = await Promise.all([publicActions.submitPublicSignature(fixture.tokens[0], signatureForm()), publicActions.submitPublicSignature(fixture.tokens[0], signatureForm())]);
    expect(results.every((result) => "success" in result)).toBe(true);
    const after = await read(fixture.request.id);
    expect(after.events.filter((event) => event.type === "signed")).toHaveLength(1);
    expect(harness.uploads.filter((path) => path.includes("/signed/"))).toHaveLength(1);
  });
  it("concurrent different recipients finalize one complete PDF without losing either signature", async () => {
    const fixture = await seed("SENT", 2);
    const results = await Promise.all(fixture.tokens.map((token) => publicActions.submitPublicSignature(token, signatureForm())));
    expect(results.every((result) => "success" in result)).toBe(true);
    const after = await read(fixture.request.id);
    expect(after.status).toBe("SIGNED"); expect(after.recipients.every((recipient) => recipient.status === "SIGNED")).toBe(true);
    expect(harness.uploads.filter((path) => path.includes("/signed/"))).toHaveLength(1);
    expect(after.events.filter((event) => event.type === "signed").every((event) => (event.metadata as { documentSha256?: string }).documentSha256 === fixture.document.originalSha256)).toBe(true);
  });
  it("public telemetry rejects forged business events at runtime", async () => {
    const fixture = await seed();
    expect(await publicActions.trackPublicSignatureEvent(fixture.tokens[0], "signed" as never)).toHaveProperty("error");
    expect((await read(fixture.request.id)).events).toHaveLength(0);
  });
  it.each(["REJECTED", "EXPIRED"] as const)("does not reopen a %s request when resending", async (status) => {
    const fixture = await seed(status);
    expect(await actions.resendSignatureRequest(fixture.request.id)).toHaveProperty("error");
    expect(await actions.resendSignatureRecipient(fixture.request.id, fixture.recipients[0].id)).toHaveProperty("error");
    expect((await read(fixture.request.id)).status).toBe(status);
  });
  it("public telemetry cannot downgrade a signed recipient", async () => {
    const fixture = await seed();
    await Promise.all([publicActions.submitPublicSignature(fixture.tokens[0], signatureForm()), publicActions.trackPublicSignatureEvent(fixture.tokens[0], "signing_started")]);
    expect((await read(fixture.request.id)).status).toBe("SIGNED");
  });
  it("placement edits cannot reopen a sent request", async () => {
    const fixture = await seed();
    expect(await actions.updateSignaturePlacement(fixture.request.id, { pageNumber: 1, x: .1, y: .1, width: .2, height: .1 })).toHaveProperty("error");
    expect((await read(fixture.request.id)).status).toBe("SENT");
  });
  it("an authenticated foreign owner cannot replace a document", async () => {
    const fixture = await seed("READY"); harness.userId = randomUUID();
    const form = new FormData(); form.set("document", new File([new Uint8Array(fixture.bytes)], "replacement.pdf", { type: "application/pdf" }));
    expect(await actions.uploadSignatureDocument(fixture.request.id, form)).toHaveProperty("error");
    expect(harness.uploads).toHaveLength(0);
  });
  it("rejects a PDF larger than the supported upload limit on the server", async () => {
    const fixture = await seed("READY");
    const bytes = Buffer.concat([fixture.bytes, Buffer.alloc(3 * 1024 * 1024)]);
    const form = new FormData(); form.set("document", new File([new Uint8Array(bytes)], "oversize.pdf", { type: "application/pdf" }));
    expect(await actions.uploadSignatureDocument(fixture.request.id, form)).toHaveProperty("error");
    expect(harness.uploads).toHaveLength(0);
  });
  it("signing and cancellation cannot leave a signed recipient under a cancelled request", async () => {
    const fixture = await seed();
    await Promise.all([publicActions.submitPublicSignature(fixture.tokens[0], signatureForm()), actions.cancelSignatureRequest(fixture.request.id)]);
    const after = await read(fixture.request.id);
    expect(["SIGNED", "CANCELLED"]).toContain(after.status);
    expect(after.recipients[0].status).toBe(after.status);
  });
  it("expiration cron rechecks its stale snapshot after another transaction completes signing", async () => {
    const fixture = await seed();
    await database.update(schema.signatureRecipients).set({ tokenExpiresAt: new Date(0) }).where(eq(schema.signatureRecipients.id, fixture.recipients[0].id));
    const findMany = database.query.signatureRecipients.findMany.bind(database.query.signatureRecipients);
    const spy = vi.spyOn(database.query.signatureRecipients, "findMany").mockImplementationOnce((...args) => {
      return (async () => {
        const snapshot = await findMany(...args);
        const signedAt = new Date();
        await database.transaction(async (tx) => {
          await tx.update(schema.signatureRequests).set({ status: "SIGNED", signedAt }).where(eq(schema.signatureRequests.id, fixture.request.id));
          await tx.update(schema.signatureRecipients).set({ status: "SIGNED", signedAt }).where(eq(schema.signatureRecipients.id, fixture.recipients[0].id));
        });
        return snapshot;
      })() as unknown as ReturnType<typeof findMany>;
    });
    vi.stubEnv("CRON_SECRET", "synthetic-signature-test");
    try {
      const response = await signatureCron.GET(new Request("https://example.invalid/api/cron/signatures", { headers: { authorization: "Bearer synthetic-signature-test" } }));
      expect((await response.json()).expired).toBe(0);
      const after = await read(fixture.request.id);
      expect(after.status).toBe("SIGNED"); expect(after.recipients[0].status).toBe("SIGNED");
      expect(after.events.filter((event) => event.type === "expired")).toHaveLength(0);
    } finally { spy.mockRestore(); }
  });
  it("a later email failure preserves the links that were already sent", async () => {
    const fixture = await seed("READY", 2);
    vi.mocked(sendSignatureRequestEmail).mockResolvedValueOnce(undefined as never).mockRejectedValueOnce(new Error("Mail service unavailable"));
    await expect(actions.sendSignatureRequest(fixture.request.id)).resolves.toHaveProperty("error");
    const sentUrl = (vi.mocked(sendSignatureRequestEmail).mock.calls[0][0] as unknown as { signingUrl: string }).signingUrl;
    const token = sentUrl.split("/").pop()!;
    expect(await publicActions.getPublicSignatureRequest(token)).toHaveProperty("request");
    expect((await read(fixture.request.id)).status).toBe("SENT");
  });
  it("email tracking cannot downgrade a signature completed after its initial lookup", async () => {
    const fixture = await seed();
    const findFirst = database.query.signatureRecipients.findFirst.bind(database.query.signatureRecipients);
    const spy = vi.spyOn(database.query.signatureRecipients, "findFirst").mockImplementationOnce((...args) => {
      return (async () => {
        const snapshot = await findFirst(...args);
        const signedAt = new Date();
        await database.transaction(async (tx) => {
          await tx.update(schema.signatureRequests).set({ status: "SIGNED", signedAt }).where(eq(schema.signatureRequests.id, fixture.request.id));
          await tx.update(schema.signatureRecipients).set({ status: "SIGNED", signedAt }).where(eq(schema.signatureRecipients.id, fixture.recipients[0].id));
        });
        return snapshot;
      })() as unknown as ReturnType<typeof findFirst>;
    });
    try {
      const response = await emailOpen.GET(new Request("https://example.invalid/pixel"), { params: Promise.resolve({ token: fixture.tokens[0] }) });
      expect(response.headers.get("content-type")).toBe("image/png");
      const after = await read(fixture.request.id);
      expect(after.status).toBe("SIGNED"); expect(after.recipients[0].status).toBe("SIGNED");
      expect(after.events.filter((event) => event.type === "email_opened")).toHaveLength(0);
    } finally { spy.mockRestore(); }
  });
  it("keeps the signed PDF and reports a pending copy when final-copy email delivery fails", async () => {
    const fixture = await seed();
    await database.update(schema.signatureRequests).set({ sendSignedCopyToRecipients: true }).where(eq(schema.signatureRequests.id, fixture.request.id));
    vi.mocked(sendSignatureRequestEmail).mockRejectedValueOnce(new Error("Mail unavailable"));
    const result = await publicActions.submitPublicSignature(fixture.tokens[0], signatureForm());
    expect(result).toHaveProperty("success", true); expect(result).toHaveProperty("warning");
    const after = await read(fixture.request.id);
    expect(after.status).toBe("SIGNED"); expect(after.document?.signedStoragePath).toBeTruthy();
    expect(after.signedCopySentAt).toBeNull(); expect(after.recipients[0].signedCopySentAt).toBeNull();
  });
});
