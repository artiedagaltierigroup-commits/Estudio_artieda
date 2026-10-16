import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = "00000000-0000-4000-8000-000000000001";
const otherOwner = "00000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000001";
const otherRequest = "10000000-0000-4000-8000-000000000002";
const storagePath = (kind: string, userId = owner, id = requestId) => `${userId}/signature-requests/${id}/${kind}/document.pdf`;
const fixture = () => ({
  id: requestId, userId: owner, status: "SIGNED", sendSignedCopyToRecipients: true,
  recipientName: "Synthetic", recipientEmail: "synthetic@example.invalid", subject: "Synthetic", signedAt: new Date(),
  client: null, case: null, events: [], placements: [],
  document: { id: "20000000-0000-4000-8000-000000000001", userId: owner, signatureRequestId: requestId,
    originalFileName: "document.pdf", originalSha256: "original-hash", signedSha256: "signed-hash",
    originalStoragePath: storagePath("original"), signedStoragePath: storagePath("signed"), signatureStoragePath: storagePath("signature") },
  recipients: [{ id: "30000000-0000-4000-8000-000000000001", userId: owner, signatureRequestId: requestId,
    firstName: "Synthetic", lastName: "", fullName: "Synthetic", email: "synthetic@example.invalid",
    status: "SIGNED", signedAt: new Date(), signatureStoragePath: storagePath("signature"), signatureSha256: "signature-hash",
    placements: [{ userId: owner, signatureRequestId: requestId, recipientId: "30000000-0000-4000-8000-000000000001",
      pageNumber: 1, placementX: "0.1", placementY: "0.1", placementWidth: "0.2", placementHeight: "0.1" }],
  }],
});
const state = vi.hoisted(() => ({ request: undefined as unknown, recipient: undefined as unknown,
  download: vi.fn(async () => ({ data: new Blob(["synthetic PDF"]), error: null })),
  signedUrl: vi.fn(async () => ({ data: { signedUrl: "https://example.invalid/signed-object" }, error: null })),
  upload: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/db", () => ({ db: { query: {
  signatureRequests: { findFirst: async () => state.request, findMany: async () => [state.request] },
  signatureRecipients: { findFirst: async () => state.recipient },
}, insert: () => ({ values: async () => {} }) } }));
vi.mock("@/lib/activity-log", () => ({ logActivity: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "00000000-0000-4000-8000-000000000001" } } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({
  download: state.download, createSignedUrl: state.signedUrl, upload: state.upload,
}) } }) }));
vi.mock("@/lib/signature-pdf", () => ({ embedRecipientSignaturesInPdf: async () => ({ signedPdfBytes: new Uint8Array([1, 2]), signedSha256: "hash" }) }));
vi.mock("@/lib/signature-certificate", () => ({ buildSignatureCertificateData: () => ({}), generateSignatureCertificatePdf: async () => new Uint8Array([1, 2]) }));

import { GET as signedDocument } from "./[id]/signed-document/route";
import { GET as signatureImage } from "./[id]/signature-image/route";
import { GET as partialDocument } from "./[id]/partial-document/route";
import { GET as certificate } from "./[id]/certificate/route";
import { GET as finalCopy } from "./final-copy/[token]/route";
import { getSignatureOriginalDocumentUrl, downloadSignedDocument } from "@/actions/signatures";

describe("privileged signature downloads stay inside the authenticated or token request scope", () => {
  let request: ReturnType<typeof fixture>;
  const context = () => ({ params: Promise.resolve({ id: requestId }) });
  beforeEach(() => {
    request = fixture(); state.request = request;
    state.recipient = { ...request.recipients[0], signedCopyTokenExpiresAt: new Date(Date.now() + 86400000), request };
    state.download.mockClear(); state.signedUrl.mockClear(); state.upload.mockClear();
  });

  it.each([otherOwner, owner])("rejects a forged signed PDF path (owner=%s) before Storage", async (pathOwner) => {
    request.document.signedStoragePath = storagePath("signed", pathOwner, pathOwner === owner ? otherRequest : requestId);
    expect(await signedDocument(new Request("https://example.invalid"), context())).toHaveProperty("status", 404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("rejects a forged signature image path", async () => {
    request.document.signatureStoragePath = storagePath("signature", otherOwner);
    expect(await signatureImage(new Request("https://example.invalid"), context())).toHaveProperty("status", 404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("rejects a forged original before rendering a partial PDF", async () => {
    request.document.originalStoragePath = storagePath("original", otherOwner);
    expect(await partialDocument(new Request("https://example.invalid"), context())).toHaveProperty("status", 404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("rejects a forged previous signature before any partial PDF download", async () => {
    request.recipients[0].signatureStoragePath = storagePath("signature", otherOwner);
    expect(await partialDocument(new Request("https://example.invalid"), context())).toHaveProperty("status", 404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("a final-copy token cannot download an object from another owner", async () => {
    request.document.signedStoragePath = storagePath("signed", otherOwner);
    expect((await finalCopy(new Request("https://example.invalid"), { params: Promise.resolve({ token: "synthetic" }) })).status).toBe(404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("a final-copy token cannot cross a document ownership relationship", async () => {
    request.document.userId = otherOwner;
    expect((await finalCopy(new Request("https://example.invalid"), { params: Promise.resolve({ token: "synthetic" }) })).status).toBe(404);
    expect(state.download).not.toHaveBeenCalled();
  });
  it("does not sign an URL for a forged original path", async () => {
    request.document.originalStoragePath = storagePath("original", otherOwner);
    expect(await getSignatureOriginalDocumentUrl(requestId)).toBeNull();
    expect(state.signedUrl).not.toHaveBeenCalled();
  });
  it("does not return a forged download path from a server action", async () => {
    request.document.signedStoragePath = storagePath("signed", otherOwner);
    expect(await downloadSignedDocument(requestId)).toHaveProperty("error");
  });
  it("rejects another owner's recipient before generating a certificate", async () => {
    request.recipients[0].userId = otherOwner;
    expect(await certificate(new Request("https://example.invalid"), context())).toHaveProperty("status", 404);
    expect(state.upload).not.toHaveBeenCalled();
  });
  it("keeps valid signed PDFs and historic retained originals available", async () => {
    expect(await signedDocument(new Request("https://example.invalid"), context())).toHaveProperty("status", 200);
    request.document.originalStoragePath = storagePath("signed");
    expect(await getSignatureOriginalDocumentUrl(requestId)).toBe("https://example.invalid/signed-object");
  });
});
