import { describe, expect, it } from "vitest";
import { normalizeClientMutationInput } from "./client-mutations";

describe("normalizeClientMutationInput", () => {
  it("preserves languages as free text and trims optional fields", () => {
    const normalized = normalizeClientMutationInput({
      name: "  Ana Perez  ",
      taxId: " 20-12345678-9 ",
      email: "  ana@correo.com ",
      phone: " 11 5555 1111 ",
      address: "  CABA ",
      languages: "  Espanol, Ingles ",
      notes: "  Cliente corporativa ",
    });

    expect(normalized).toEqual({
      name: "Ana Perez",
      taxId: "20-12345678-9",
      email: "ana@correo.com",
      phone: "11 5555 1111",
      address: "CABA",
      languages: "Espanol, Ingles",
      notes: "Cliente corporativa",
    });
  });

  it("converts empty optional text values to null", () => {
    const normalized = normalizeClientMutationInput({
      name: "Bruno Diaz",
      taxId: " ",
      email: "",
      phone: undefined,
      address: " ",
      languages: " ",
      notes: "",
    });

    expect(normalized).toEqual({
      name: "Bruno Diaz",
      taxId: null,
      email: null,
      phone: null,
      address: null,
      languages: null,
      notes: null,
    });
  });
});
