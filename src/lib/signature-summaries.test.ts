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
    });
  });
});
