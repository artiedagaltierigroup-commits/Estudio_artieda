import { describe, expect, it } from "vitest";
import {
  mapLegacySignatureRequestToRecipientRows,
  mapLegacySignatureStatusToRecipientStatus,
} from "./signature-legacy-migration";

describe("legacy signature migration helpers", () => {
  it("maps a legacy request and document to one recipient and one placement", () => {
    const request = {
      id: "request-1",
      userId: "user-1",
      clientId: "client-1",
      recipientName: "Victoria Artieda",
      recipientEmail: "victoria@estudioartieda.com",
      recipientTaxId: "20123456789",
      status: "SENT" as const,
      tokenHash: "hash-1",
      tokenExpiresAt: new Date("2026-07-01T10:00:00.000Z"),
      sentAt: new Date("2026-06-18T10:00:00.000Z"),
      signedAt: null,
      cancelledAt: null,
      rejectedAt: null,
      createdAt: new Date("2026-06-18T09:00:00.000Z"),
      updatedAt: new Date("2026-06-18T11:00:00.000Z"),
    };

    const document = {
      userId: "user-1",
      signatureRequestId: "request-1",
      signatureStoragePath: "signatures/request-1.png",
      signatureSha256: "signature-sha",
      pageNumber: 2,
      placementX: "0.1250",
      placementY: "0.2500",
      placementWidth: "0.3000",
      placementHeight: "0.1200",
      createdAt: new Date("2026-06-18T09:05:00.000Z"),
      updatedAt: new Date("2026-06-18T10:55:00.000Z"),
    };

    const rows = mapLegacySignatureRequestToRecipientRows({
      request,
      document,
      recipientId: "recipient-1",
    });

    expect(rows.recipient).toMatchObject({
      userId: "user-1",
      signatureRequestId: "request-1",
      clientId: "client-1",
      firstName: "Victoria",
      lastName: "Artieda",
      fullName: "Victoria Artieda",
      email: "victoria@estudioartieda.com",
      taxId: "20123456789",
      status: "SENT",
      tokenHash: "hash-1",
      color: "#9A4E69",
      sortOrder: 0,
      signatureStoragePath: "signatures/request-1.png",
      signatureSha256: "signature-sha",
    });
    expect(rows.placement).toMatchObject({
      userId: "user-1",
      signatureRequestId: "request-1",
      recipientId: "recipient-1",
      pageNumber: 2,
      placementX: "0.1250",
      placementY: "0.2500",
      placementWidth: "0.3000",
      placementHeight: "0.1200",
      sortOrder: 0,
    });
  });

  it("maps rejected legacy requests to cancelled recipients", () => {
    expect(mapLegacySignatureStatusToRecipientStatus("REJECTED")).toBe("CANCELLED");
  });

  it("uses rejected date as cancelled date for rejected legacy requests", () => {
    const rejectedAt = new Date("2026-06-18T12:00:00.000Z");
    const rows = mapLegacySignatureRequestToRecipientRows({
      request: {
        id: "request-2",
        userId: "user-1",
        clientId: null,
        recipientName: null,
        recipientEmail: "firmante@example.com",
        recipientTaxId: null,
        status: "REJECTED",
        tokenHash: "hash-2",
        tokenExpiresAt: new Date("2026-07-01T10:00:00.000Z"),
        sentAt: null,
        signedAt: null,
        cancelledAt: null,
        rejectedAt,
        createdAt: new Date("2026-06-18T09:00:00.000Z"),
        updatedAt: new Date("2026-06-18T11:00:00.000Z"),
      },
      document: null,
      recipientId: "recipient-2",
    });

    expect(rows.recipient.status).toBe("CANCELLED");
    expect(rows.recipient.cancelledAt).toBe(rejectedAt);
    expect(rows.recipient.firstName).toBe("firmante@example.com");
    expect(rows.placement).toBeNull();
  });
});
