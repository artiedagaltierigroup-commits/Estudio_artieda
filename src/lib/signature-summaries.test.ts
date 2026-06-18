import { describe, expect, it } from "vitest";
import { summarizeSignatureRequests } from "./signature-summaries";

describe("signature summaries", () => {
  it("counts pending and signed requests", () => {
    expect(
      summarizeSignatureRequests([
        { status: "SENT" },
        { status: "DOCUMENT_VIEWED" },
        { status: "SIGNED" },
        { status: "CANCELLED" },
      ])
    ).toEqual({
      total: 4,
      pending: 2,
      signed: 1,
      recipients: 4,
      signedRecipients: 1,
    });
  });

  it("counts recipient progress when recipient rows are available", () => {
    expect(
      summarizeSignatureRequests([
        { status: "PARTIALLY_SIGNED", recipients: [{ status: "SIGNED" }, { status: "SENT" }] },
        { status: "SIGNED", recipients: [{ status: "SIGNED" }] },
      ])
    ).toEqual({
      total: 2,
      pending: 1,
      signed: 1,
      recipients: 3,
      signedRecipients: 2,
    });
  });
});
