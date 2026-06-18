import { describe, expect, it } from "vitest";
import { getSupabaseAdminKey } from "./admin";

describe("supabase admin helpers", () => {
  it("prefers the service role key for server-side storage operations", () => {
    expect(
      getSupabaseAdminKey({
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        SUPABASE_SECRET_KEY: "secret-key",
      })
    ).toBe("service-role");
  });

  it("falls back to the Supabase secret key", () => {
    expect(getSupabaseAdminKey({ SUPABASE_SECRET_KEY: "secret-key" })).toBe("secret-key");
  });

  it("fails clearly when no server-side Supabase key is configured", () => {
    expect(() => getSupabaseAdminKey({})).toThrow("Missing Supabase server key");
  });
});
