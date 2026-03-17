import { describe, expect, it } from "vitest";
import { getSupabasePublicKey } from "./env";

describe("getSupabasePublicKey", () => {
  it("prefers the publishable key when available", () => {
    const key = getSupabasePublicKey({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(key).toBe("publishable-key");
  });

  it("falls back to the anon key for backward compatibility", () => {
    const key = getSupabasePublicKey({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(key).toBe("anon-key");
  });
});
