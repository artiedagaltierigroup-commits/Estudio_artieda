import { describe, expect, it } from "vitest";
import { isSignatureRequestExpired } from "./signature-expiration";

describe("signature expiration", () => {
  it("detects expired requests", () => {
    expect(
      isSignatureRequestExpired({
        status: "SENT",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(true);
  });

  it("does not expire signed requests", () => {
    expect(
      isSignatureRequestExpired({
        status: "SIGNED",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(false);
  });
});
