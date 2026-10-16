import { afterEach, describe, expect, it, vi } from "vitest";
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]) }));
vi.mock("@/db", () => ({ db: { query: { signatureRecipients: { findMany } } } }));
import { GET } from "./route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("signature cron authorization", () => {
  it("fails closed if the scheduling secret is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("https://example.test/api/cron/signatures"))).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });
  it("rejects an incorrect bearer before reading the database", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-secret");
    const request = new Request("https://example.test/api/cron/signatures", { headers: { authorization: "Bearer wrong" } });
    expect((await GET(request)).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });
  it("accepts the configured scheduler secret", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-secret");
    const request = new Request("https://example.test/api/cron/signatures", { headers: { authorization: "Bearer synthetic-secret" } });
    expect((await GET(request)).status).toBe(200);
    expect(findMany).toHaveBeenCalledOnce();
  });
});
