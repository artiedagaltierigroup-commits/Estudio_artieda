import { describe, expect, it } from "vitest";
import {
  buildRecipientTokenPayloads,
  buildDefaultSignatureSubject,
  buildRecipientName,
  normalizeSignatureEmail,
  parseSendSignedCopyToRecipients,
  parseSignatureRecipientsFromFormData,
  splitPersonName,
  validateSignatureRecipients,
} from "./signatures-helpers";

describe("signature action helpers", () => {
  it("builds a clear default subject", () => {
    expect(buildDefaultSignatureSubject("Contrato de honorarios")).toBe(
      "Solicitud de firma: Contrato de honorarios"
    );
  });

  it("normalizes recipient emails", () => {
    expect(normalizeSignatureEmail(" CLIENTE@MAIL.COM ")).toBe("cliente@mail.com");
  });

  it("parses the final signed copy option from form data", () => {
    const enabled = new FormData();
    enabled.set("sendSignedCopyToRecipients", "on");

    const disabled = new FormData();

    expect(parseSendSignedCopyToRecipients(enabled)).toBe(true);
    expect(parseSendSignedCopyToRecipients(disabled)).toBe(false);
  });

  it("builds recipient names from first and last name", () => {
    expect(buildRecipientName({ firstName: " Walter ", lastName: " Galtieri " })).toBe("Walter Galtieri");
    expect(buildRecipientName({ firstName: "Walter", lastName: "" })).toBe("Walter");
  });

  it("splits client names into first and last name for autofill", () => {
    expect(splitPersonName("Walter Quimey Galtieri")).toEqual({
      firstName: "Walter",
      lastName: "Quimey Galtieri",
    });
  });

  it("parses indexed recipient fields and placements from form data", () => {
    const formData = new FormData();
    formData.set("recipients[1].firstName", " Ana ");
    formData.set("recipients[1].lastName", " Perez ");
    formData.set("recipients[1].email", " ANA@MAIL.COM ");
    formData.set("recipients[1].taxId", " 30111222333 ");
    formData.set("recipients[1].clientId", "client-2");
    formData.set("recipients[1].placements[0].pageNumber", "2");
    formData.set("recipients[1].placements[0].x", "0.12");
    formData.set("recipients[1].placements[0].y", "0.25");
    formData.set("recipients[1].placements[0].width", "0.3");
    formData.set("recipients[1].placements[0].height", "0.1");
    formData.set("recipients[0].firstName", "Walter");
    formData.set("recipients[0].lastName", "Galtieri");
    formData.set("recipients[0].email", "walter@mail.com");

    expect(parseSignatureRecipientsFromFormData(formData)).toEqual([
      {
        firstName: "Walter",
        lastName: "Galtieri",
        fullName: "Walter Galtieri",
        email: "walter@mail.com",
        taxId: null,
        clientId: null,
        placements: [],
      },
      {
        firstName: "Ana",
        lastName: "Perez",
        fullName: "Ana Perez",
        email: "ana@mail.com",
        taxId: "30111222333",
        clientId: "client-2",
        placements: [
          {
            pageNumber: 2,
            x: 0.12,
            y: 0.25,
            width: 0.3,
            height: 0.1,
          },
        ],
      },
    ]);
  });

  it("parses the legacy single-recipient fields as one recipient", () => {
    const formData = new FormData();
    formData.set("clientId", "client-1");
    formData.set("recipientFirstName", "Victoria");
    formData.set("recipientLastName", "Artieda");
    formData.set("recipientEmail", " victoria@estudioartieda.com ");
    formData.set("recipientTaxId", " 20123456789 ");

    expect(parseSignatureRecipientsFromFormData(formData)).toEqual([
      {
        firstName: "Victoria",
        lastName: "Artieda",
        fullName: "Victoria Artieda",
        email: "victoria@estudioartieda.com",
        taxId: "20123456789",
        clientId: "client-1",
        placements: [],
      },
    ]);
  });

  it("validates recipient count and required emails", () => {
    expect(validateSignatureRecipients([])).toEqual({
      success: false,
      error: "Agrega al menos un destinatario",
    });
    expect(validateSignatureRecipients([{ firstName: "Ana", lastName: "", fullName: "Ana", email: "", taxId: null, clientId: null, placements: [] }])).toEqual({
      success: false,
      error: "Cada destinatario necesita un email",
    });
    expect(
      validateSignatureRecipients(
        Array.from({ length: 51 }, (_, index) => ({
          firstName: `Nombre ${index}`,
          lastName: "Apellido",
          fullName: `Nombre ${index} Apellido`,
          email: `persona${index}@mail.com`,
          taxId: null,
          clientId: null,
          placements: [],
        }))
      )
    ).toEqual({
      success: false,
      error: "No se pueden agregar mas destinatarios",
    });
  });

  it("requires each recipient to have at least one signature placement", () => {
    expect(
      validateSignatureRecipients([
        {
          firstName: "Ana",
          lastName: "Perez",
          fullName: "Ana Perez",
          email: "ana@mail.com",
          taxId: null,
          clientId: null,
          placements: [],
        },
      ])
    ).toEqual({
      success: false,
      error: "Cada destinatario necesita al menos un espacio de firma",
    });
  });

  it("builds deterministic token payloads for recipients", () => {
    const expiresAt = new Date("2026-07-01T10:00:00.000Z");

    expect(
      buildRecipientTokenPayloads(
        [
          { firstName: "Ana", lastName: "Perez", fullName: "Ana Perez", email: "ana@mail.com", taxId: null, clientId: null, placements: [] },
          { firstName: "Luis", lastName: "Lopez", fullName: "Luis Lopez", email: "luis@mail.com", taxId: null, clientId: null, placements: [] },
        ],
        {
          tokenFactory: (_recipient, index) => `token-${index}`,
          hashToken: (token) => `hash:${token}`,
          tokenExpiresAt: expiresAt,
        }
      )
    ).toEqual([
      expect.objectContaining({ email: "ana@mail.com", token: "token-0", tokenHash: "hash:token-0", tokenExpiresAt: expiresAt }),
      expect.objectContaining({ email: "luis@mail.com", token: "token-1", tokenHash: "hash:token-1", tokenExpiresAt: expiresAt }),
    ]);
  });
});
