import { beforeEach, describe, expect, it, vi } from "vitest";

const { deny, query } = vi.hoisted(() => ({
  deny: vi.fn(async () => { throw Object.assign(new Error("Access denied"), { code: "ACCESS_DENIED" }); }),
  query: vi.fn(() => { throw new Error("Database must not be reached"); }),
}));
vi.mock("@/lib/workspace-access", () => ({ requireAdminAccess: deny }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {
  getUser: async () => ({ data: { user: { id: "collaborator" } } }),
} }) }));
vi.mock("@/db", () => ({ db: {
  query: new Proxy({}, { get: () => ({ findMany: query, findFirst: query }) }),
  select: query, insert: query, update: query, delete: query, transaction: query,
} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => { query.mockClear(); });

import * as charges from "./charges";
import * as payments from "./payments";
import * as expenses from "./expenses";
import * as recurringExpenses from "./recurring-expenses";
import * as recurringOccurrences from "./recurring-expense-occurrences";
import * as savings from "./savings";
import * as dashboard from "./dashboard";
import * as calendar from "./calendar";
import * as activityLog from "./activity-log";
import * as demoSeed from "./demo-seed";
const modules = { charges, payments, expenses, recurringExpenses, recurringOccurrences, savings, dashboard, calendar, activityLog, demoSeed };

describe("all financial server entry points deny collaborators before database access", () => {
  for (const [name, module] of Object.entries(modules)) {
    it(name, async () => {
      for (const action of Object.values(module)) {
        if (typeof action !== "function") continue;
        await expect((action as (...args: unknown[]) => Promise<unknown>)(new FormData(), "2099-01-01", "2099-12-31")).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      }
      expect(query).not.toHaveBeenCalled();
    });
  }
});
