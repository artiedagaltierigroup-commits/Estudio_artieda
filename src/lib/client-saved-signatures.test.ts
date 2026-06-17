import { describe, expect, it } from "vitest";
import { shouldOfferSavedSignature } from "./client-saved-signatures";

describe("client saved signatures", () => {
  it("offers saved signature only when client and saved signature exist", () => {
    expect(shouldOfferSavedSignature({ clientId: "client-1", savedSignatureId: "sig-1" })).toBe(true);
    expect(shouldOfferSavedSignature({ clientId: "client-1", savedSignatureId: null })).toBe(false);
    expect(shouldOfferSavedSignature({ clientId: null, savedSignatureId: "sig-1" })).toBe(false);
  });
});
