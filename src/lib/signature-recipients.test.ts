import { describe, expect, it } from "vitest";
import {
  MAX_SIGNATURE_RECIPIENTS,
  canAddSignatureRecipient,
  getAggregateSignatureStatus,
  recipientHasRequiredPlacements,
} from "./signature-recipients";

describe("signature recipient helpers", () => {
  it("limits requests to the configured recipient cap", () => {
    expect(MAX_SIGNATURE_RECIPIENTS).toBe(50);
    expect(canAddSignatureRecipient(49)).toBe(true);
    expect(canAddSignatureRecipient(50)).toBe(false);
    expect(canAddSignatureRecipient(51)).toBe(false);
  });

  it("aggregates signed recipients into partial or final request states", () => {
    expect(getAggregateSignatureStatus([{ status: "SIGNED" }, { status: "SENT" }])).toBe("PARTIALLY_SIGNED");
    expect(getAggregateSignatureStatus([{ status: "SIGNED" }, { status: "SIGNED" }])).toBe("SIGNED");
  });

  it("keeps pending request states when nobody has signed yet", () => {
    expect(getAggregateSignatureStatus([])).toBe("DRAFT");
    expect(getAggregateSignatureStatus([{ status: "READY" }, { status: "READY" }])).toBe("READY");
    expect(getAggregateSignatureStatus([{ status: "SENT" }, { status: "EMAIL_OPENED" }])).toBe("SENT");
  });

  it("detects whether a recipient has at least one placement", () => {
    expect(recipientHasRequiredPlacements({ placements: [{ id: "placement-1" }] })).toBe(true);
    expect(recipientHasRequiredPlacements({ placements: [] })).toBe(false);
    expect(recipientHasRequiredPlacements({ placements: null })).toBe(false);
  });
});
