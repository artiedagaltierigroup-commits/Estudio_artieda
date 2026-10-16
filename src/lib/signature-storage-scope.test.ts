import { describe, expect, it } from "vitest";
import { assertSignatureStoragePath, isOwnedSignatureRequestGraph, isSignatureStoragePath } from "./signature-storage-scope";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000001";
const otherRequestId = "10000000-0000-4000-8000-000000000002";
const scope = { userId, requestId };
const prefix = `${userId}/signature-requests/${requestId}`;

describe("signature Storage object boundary", () => {
  it.each(["original", "signed", "signature", "certificate"])("accepts a canonical %s artifact of this request", (kind) => {
    expect(isSignatureStoragePath(`${prefix}/${kind}/document-v1.0.pdf`, scope)).toBe(true);
    expect(() => assertSignatureStoragePath(`${prefix}/${kind}/document.pdf`, scope)).not.toThrow();
  });
  it.each([
    `${otherUserId}/signature-requests/${requestId}/signed/document.pdf`,
    `${userId}/signature-requests/${otherRequestId}/signed/document.pdf`,
    `/${prefix}/signed/document.pdf`,
    `${prefix}/original/../signed/document.pdf`,
    `${prefix}/signed/.`, `${prefix}/signed/..`,
    `${prefix}/signed/%2e%2e`, `${prefix}/signed/%252e%252e`,
    `${prefix}/signed/document%2fpdf`, `${prefix}/signed/document%5cpdf`,
    `${prefix}/signed/document\\pdf`, `${prefix}/signed/document.pdf?download=1`,
    `${prefix}/signed/document.pdf#fragment`, `${prefix}/signed/document\u0000.pdf`,
    `${prefix}/signed//document.pdf`, `${prefix}/unknown/document.pdf`,
    `https://example.invalid/${prefix}/signed/document.pdf`,
  ])("rejects an out-of-scope or ambiguous path: %s", (path) => {
    expect(isSignatureStoragePath(path, scope)).toBe(false);
    expect(() => assertSignatureStoragePath(path, scope)).toThrow();
  });
  it("does not derive trust from an invalid caller scope", () => {
    expect(isSignatureStoragePath("../signature-requests/request/signed/doc.pdf", { userId: "..", requestId: "request" })).toBe(false);
  });
  it("checks owners and request IDs across loaded relationships", () => {
    const recipient = { id: "recipient", userId, signatureRequestId: requestId };
    const valid = { id: requestId, userId, recipients: [recipient], document: { userId, signatureRequestId: requestId } };
    expect(isOwnedSignatureRequestGraph(valid, userId)).toBe(true);
    expect(isOwnedSignatureRequestGraph({ ...valid, userId: otherUserId }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, client: { userId: otherUserId } }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, case: { userId: otherUserId } }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, document: { userId, signatureRequestId: otherRequestId } }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, recipients: [{ ...recipient, userId: otherUserId }] }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, events: [{ userId, signatureRequestId: requestId, signatureRecipientId: "other" }] }, userId)).toBe(false);
    expect(isOwnedSignatureRequestGraph({ ...valid, placements: [{ userId, signatureRequestId: requestId, recipientId: "other" }] }, userId)).toBe(false);
  });
});
