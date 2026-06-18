import { describe, expect, it } from "vitest";
import {
  isSignatureRecipientExpired,
  isSignatureRequestExpired,
  shouldExpireSignatureRequestFromRecipients,
} from "./signature-expiration";

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

  it("detects expired recipients independently", () => {
    expect(
      isSignatureRecipientExpired({
        status: "SENT",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(true);
  });

  it("does not expire recipients that already signed", () => {
    expect(
      isSignatureRecipientExpired({
        status: "SIGNED",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(false);
  });

  it("expires the request only when all recipients are expired or cancelled", () => {
    expect(shouldExpireSignatureRequestFromRecipients([{ status: "EXPIRED" }, { status: "CANCELLED" }])).toBe(true);
    expect(shouldExpireSignatureRequestFromRecipients([{ status: "EXPIRED" }, { status: "SENT" }])).toBe(false);
    expect(shouldExpireSignatureRequestFromRecipients([{ status: "EXPIRED" }, { status: "SIGNED" }])).toBe(false);
  });
});
