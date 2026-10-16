vi.mock("@/lib/workspace-access", () => ({ requireAdminAccess: async () => ({actorUserId:"owner",ownerUserId:"owner",role:"ADMIN"}) }));
import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]) }));
vi.mock("../db", () => ({ db: { query: { activityLog: { findMany } } } }));
vi.mock("../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }),
}));
import * as actions from "./activity-log";

describe("activity log server action boundary", () => {
  it("does not publish the privileged writer as a remotely callable action", () => {
    expect(Object.keys(actions)).not.toContain("logActivity");
  });

  it("keeps the authenticated history reader available", async () => {
    await expect(actions.getActivityLog()).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledOnce();
  });
});
