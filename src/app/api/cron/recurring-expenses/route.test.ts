import { afterEach, describe, expect, it, vi } from "vitest";
const { sync } = vi.hoisted(() => ({ sync: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/recurring-expense-sync", () => ({ syncAllRecurringExpenseOccurrences: sync }));
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("recurring expense cron authorization", () => {
  it.each(["", "Bearer wrong"])("rejects an invalid scheduler credential (%s)", async authorization => {
    vi.stubEnv("CRON_SECRET", "synthetic-secret");
    expect((await GET(new Request("https://example.test/api/cron/recurring-expenses", { headers: { authorization } }))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
  it("fails closed with missing configuration", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("https://example.test/api/cron/recurring-expenses"))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
  it("executes for the configured scheduler", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-secret");
    expect((await GET(new Request("https://example.test/api/cron/recurring-expenses", { headers: { authorization: "Bearer synthetic-secret" } }))).status).toBe(200);
    expect(sync).toHaveBeenCalledOnce();
  });
});
