import { describe, expect, it } from "vitest";
import { getSignatureStatusLabel, getSignatureStatusTone } from "./signature-status";

describe("signature status presenters", () => {
  it("returns Spanish labels for signature states", () => {
    expect(getSignatureStatusLabel("DRAFT")).toBe("Borrador");
    expect(getSignatureStatusLabel("SENT")).toBe("Enviada");
    expect(getSignatureStatusLabel("SIGNED")).toBe("Firmada");
  });

  it("returns stable tones for list filtering and chips", () => {
    expect(getSignatureStatusTone("SIGNED")).toBe("sage");
    expect(getSignatureStatusTone("EXPIRED")).toBe("danger");
    expect(getSignatureStatusTone("SIGNING_INTERRUPTED")).toBe("amber");
  });
});
