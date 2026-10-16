import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { signatureRequests } from "../db/schema";

const state = vi.hoisted(() => ({
  owner: "00000000-0000-4000-8000-000000000001",
  actor: "00000000-0000-4000-8000-000000000002",
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
  request: undefined as unknown,
  reads: [] as unknown[],
  log: vi.fn(async () => {}),
  event: vi.fn(async () => {}),
  remove: vi.fn(() => ({ where: async () => {} })),
  send: vi.fn(async () => {}),
}));

type Query = { where: (table: typeof signatureRequests, operators: { and: typeof and; eq: typeof eq }) => Parameters<PgDialect["sqlToQuery"]>[0]; with?: { case?: true | { columns: Record<string, boolean> } } };
async function readRequest(query: Query) {
  state.reads.push(query);
  const params = new PgDialect().sqlToQuery(query.where(signatureRequests, { and, eq })).params;
  const request = state.request as ReturnType<typeof fixture>;
  if (!params.includes(request.userId)) return undefined;
  const columns = query.with?.case;
  return {
    ...request,
    case: columns && columns !== true
      ? Object.fromEntries(Object.entries(request.case).filter(([key]) => columns.columns[key]))
      : request.case,
  };
}

vi.mock("../db", () => ({ db: {
  query: { signatureRequests: {
    findFirst: (query: Query) => readRequest(query),
    findMany: async (query: Query) => { const request = await readRequest(query); return request ? [request] : []; },
  } },
  insert: () => ({ values: state.event }),
  update: () => ({ set: () => ({ where: async () => {} }) }),
  delete: state.remove,
} }));
vi.mock("../lib/workspace-access", () => ({
  getWorkspaceAccess: async () => ({ actorUserId: state.actor, ownerUserId: state.owner, role: state.role }),
  requireAdminAccess: async () => {
    if (state.role !== "ADMIN") throw new Error("Acceso restringido");
    return { actorUserId: state.actor, ownerUserId: state.owner, role: state.role };
  },
}));
vi.mock("../lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: state.actor } } }) } }) }));
vi.mock("../lib/activity-log", () => ({ logActivity: state.log }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/signature-transaction", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/signature-transaction")>(),
  withSignatureRequestLock: async (_id: string, work: (tx: unknown) => unknown) => work((await import("../db")).db),
}));
vi.mock("../lib/signature-email", () => ({
  buildRecipientSignatureEmail: ({ token }: { token: string }) => ({ signingUrl: `https://example.invalid/${token}` }),
  sendSignatureRequestEmail: state.send,
}));

import { cancelSignatureRequest, deleteSignatureRequest, downloadSignedDocument, getSignatureRequest, getSignatureRequests, sendSignatureRequest } from "./signatures";
import { getAuthenticatedSignatureRequest } from "../app/api/signatures/[id]/downloads";

function fixture(userId = state.owner) {
  const id = "10000000-0000-4000-8000-000000000001";
  const recipientId = "20000000-0000-4000-8000-000000000001";
  return {
    id, userId, subject: "Acuerdo", message: "Texto existente con importe 4500", status: "READY", sentAt: null,
    client: null, case: { id: "30000000-0000-4000-8000-000000000001", userId, title: "Caso", fee: "4500.00", preferredPaymentMethod: "TRANSFER" },
    document: { id: "40000000-0000-4000-8000-000000000001", userId, signatureRequestId: id,
      signedStoragePath: `${userId}/signature-requests/${id}/signed/test.pdf` },
    recipients: [{ id: recipientId, userId, signatureRequestId: id, status: "READY", email: "synthetic@example.invalid",
      fullName: "Synthetic", sentAt: null, signedAt: null, placements: [{ userId, signatureRequestId: id, recipientId }], events: [] }],
    events: [], placements: [],
  };
}

describe("signature workspace permissions", () => {
  beforeEach(() => {
    state.actor = "00000000-0000-4000-8000-000000000002";
    state.role = "COLLABORATOR";
    state.request = fixture(); state.reads = [];
    state.log.mockClear(); state.event.mockClear(); state.remove.mockClear(); state.send.mockClear();
  });

  it("shares the office's requests and accepted existing text without structured case money", async () => {
    const request = await getSignatureRequest(fixture().id);
    expect(request?.id).toBe(fixture().id);
    expect(request?.message).toContain("4500");
    expect(request?.case).toMatchObject({ title: "Caso" });
    expect(request?.case).not.toHaveProperty("fee");
    expect(request?.case).not.toHaveProperty("preferredPaymentMethod");
    expect((await getSignatureRequests())[0]?.case).not.toHaveProperty("fee");
  });

  it("does not reveal another office's request", async () => {
    state.request = fixture("00000000-0000-4000-8000-000000000003");
    expect(await getSignatureRequest(fixture().id)).toBeUndefined();
    expect(await getSignatureRequests()).toEqual([]);
  });

  it("denies permanent deletion before locking, reading or writing", async () => {
    await expect(deleteSignatureRequest(fixture().id)).rejects.toThrow("Acceso restringido");
    expect(state.reads).toHaveLength(0);
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.log).not.toHaveBeenCalled();
  });

  it("preserves administrator deletion and attributes its audit", async () => {
    state.actor = state.owner; state.role = "ADMIN";
    expect(await deleteSignatureRequest(fixture().id)).toEqual({ success: true });
    expect(state.remove).toHaveBeenCalledOnce();
    expect(state.log).toHaveBeenCalledWith(expect.objectContaining({ userId: state.owner, actorUserId: state.owner, action: "deleted" }), expect.anything());
  });

  it("keeps collaborator cancellation in the office and attributes the actor", async () => {
    expect(await cancelSignatureRequest(fixture().id)).toEqual({ success: true });
    expect(state.log).toHaveBeenCalledWith(expect.objectContaining({ userId: state.owner, actorUserId: state.actor, action: "cancelled" }), expect.anything());
    expect(state.event).toHaveBeenCalledWith(expect.objectContaining({ userId: state.owner, metadata: expect.objectContaining({ actorUserId: state.actor }) }));
  });

  it("prepares office signature delivery with the actor recorded (mail service is simulated)", async () => {
    expect(await sendSignatureRequest(fixture().id)).toHaveProperty("success", true);
    expect(state.send).toHaveBeenCalledOnce();
    expect(state.log).toHaveBeenCalledWith(expect.objectContaining({ userId: state.owner, actorUserId: state.actor, action: "sent" }), expect.anything());
  });

  it("allows office document downloads with owner storage scope and actor audit", async () => {
    expect(await downloadSignedDocument(fixture().id)).toEqual({ success: true, storagePath: fixture().document.signedStoragePath });
    expect(state.log).toHaveBeenCalledWith(expect.objectContaining({ userId: state.owner, actorUserId: state.actor, action: "downloaded" }));
  });

  it("authorizes download routes through membership and excludes nested case money", async () => {
    const result = await getAuthenticatedSignatureRequest(fixture().id);
    expect(result).toMatchObject({ userId: state.owner, actorUserId: state.actor, request: { id: fixture().id } });
    if (result.request) {
      expect(result.request.case).not.toHaveProperty("fee");
      expect(result.request.case).not.toHaveProperty("preferredPaymentMethod");
    }
  });
});
