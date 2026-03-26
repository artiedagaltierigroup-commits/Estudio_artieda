import { describe, expect, it } from "vitest";
import { filterCaseFormClients } from "./case-form-clients";

describe("filterCaseFormClients", () => {
  const clients = [
    { id: "1", name: "Walter Gomez", email: "walter@correo.com", phone: "1111", taxId: "20-1" },
    { id: "2", name: "Ana Perez", email: "ana@correo.com", phone: "2222", taxId: "30-2" },
    { id: "3", name: "Wanda Lopez", email: "wanda@correo.com", phone: "3333", taxId: "40-3" },
  ];

  it("returns all clients when query is empty", () => {
    expect(filterCaseFormClients(clients, "")).toHaveLength(3);
  });

  it("filters clients by partial text while typing", () => {
    expect(filterCaseFormClients(clients, "walt")).toEqual([clients[0]]);
    expect(filterCaseFormClients(clients, "wan")).toEqual([clients[2]]);
  });

  it("also matches by email, phone and tax id", () => {
    expect(filterCaseFormClients(clients, "ana@")).toEqual([clients[1]]);
    expect(filterCaseFormClients(clients, "3333")).toEqual([clients[2]]);
    expect(filterCaseFormClients(clients, "30-2")).toEqual([clients[1]]);
  });
});
