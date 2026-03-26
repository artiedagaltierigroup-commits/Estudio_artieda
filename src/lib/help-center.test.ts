import { describe, expect, it } from "vitest";
import { filterHelpEntries, helpEntries, helpModules } from "./help-center";

describe("help center data", () => {
  it("exposes the primary modules of the system", () => {
    expect(helpModules.map((item) => item.href)).toEqual([
      "/",
      "/clientes",
      "/casos",
      "/cobros",
      "/calendario",
      "/gastos",
      "/gastos/recurrentes",
      "/recordatorios",
      "/estadisticas",
      "/historial",
    ]);
  });
});

describe("filterHelpEntries", () => {
  it("returns the full collection when the query is empty", () => {
    expect(filterHelpEntries(helpEntries, "")).toHaveLength(helpEntries.length);
    expect(filterHelpEntries(helpEntries, "   ")).toHaveLength(helpEntries.length);
  });

  it("finds entries by module terms and keywords", () => {
    const result = filterHelpEntries(helpEntries, "cobro");

    expect(result.map((item) => item.id)).toContain("screen-cobros");
    expect(result.map((item) => item.id)).toContain("task-crear-cobro");
    expect(result.map((item) => item.id)).toContain("concept-estados-cobro");
  });

  it("matches multi-word searches ignoring case", () => {
    const result = filterHelpEntries(helpEntries, "Registrar Pago");

    expect(result.map((item) => item.id)).toContain("task-registrar-pago");
  });

  it("matches text inside long-form guidance", () => {
    const result = filterHelpEntries(helpEntries, "estado de caso");

    expect(result.map((item) => item.id)).toContain("concept-estados-caso");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterHelpEntries(helpEntries, "wifi impresora router")).toEqual([]);
  });
});
