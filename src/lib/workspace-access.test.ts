import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "actor", email: "staff@example.test", user_metadata: { role: "ADMIN" } } as any,
  error: null as unknown,
  member: { userId: "actor", ownerUserId: "office", displayName: "Briza", role: "COLLABORATOR", enabled: true } as any,
  owner: { userId: "office", ownerUserId: "office", displayName: "Victoria", role: "ADMIN", enabled: true } as any,
  findFirst: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {
  getUser: async () => ({ data: { user: state.user }, error: state.error }),
} }) }));
vi.mock("@/db", () => ({ db: { query: { workspaceMembers: { findFirst: state.findFirst } } } }));
import { getWorkspaceAccess, requireAdminAccess } from "./workspace-access";

beforeEach(() => {
  state.user = { id: "actor", email: "staff@example.test", user_metadata: { role: "ADMIN" } };
  state.error = null;
  state.member = { userId: "actor", ownerUserId: "office", displayName: "Briza", role: "COLLABORATOR", enabled: true };
  state.owner = { userId: "office", ownerUserId: "office", displayName: "Victoria", role: "ADMIN", enabled: true };
  state.findFirst.mockReset().mockImplementationOnce(async () => state.member).mockImplementation(async () => state.owner);
});

describe("workspace access", () => {
  it("resolves shared office from protected membership, ignoring user metadata", async () => {
    expect(await getWorkspaceAccess()).toEqual({ actorUserId: "actor", ownerUserId: "office", displayName: "Briza", role: "COLLABORATOR", email: "staff@example.test" });
  });
  it("keeps an administrator scoped to their own office", async () => {
    state.member = { userId: "actor", ownerUserId: "actor", displayName: "Victoria", role: "ADMIN", enabled: true };
    expect(await requireAdminAccess()).toMatchObject({ actorUserId: "actor", ownerUserId: "actor", role: "ADMIN" });
  });
  it("denies financial privileges to a collaborator", async () => {
    await expect(requireAdminAccess()).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
  it.each([null, { enabled: false }, { ...state.member, displayName: "   " }, { enabled: true, role: "ADMIN", ownerUserId: "other" }, { enabled: true, role: "invented" }])("fails closed for missing/invalid membership %j", async member => {
    state.member = member;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
  it.each([null, { ...state.owner, enabled: false }, { ...state.owner, role: "COLLABORATOR" }])("denies a collaborator when the office administrator is absent/inactive %j", async owner => {
    state.owner = owner;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
  it("does not query data for an unauthenticated session", async () => {
    state.user = null;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(state.findFirst).not.toHaveBeenCalled();
  });
  it("rejects a failed authentication verification", async () => {
    state.error = new Error("invalid token");
    await expect(getWorkspaceAccess()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("propagates membership database failure instead of granting fallback access", async () => {
    state.findFirst.mockReset().mockRejectedValue(new Error("unavailable"));
    await expect(getWorkspaceAccess()).rejects.toThrow("unavailable");
  });
});
