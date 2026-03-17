import { describe, expect, it } from "vitest";
import { dashboardNavigation, getRouteMeta } from "./app-shell";

describe("dashboardNavigation", () => {
  it("includes the base modules for phase 2", () => {
    expect(dashboardNavigation.map((item) => item.href)).toEqual([
      "/",
      "/clientes",
      "/casos",
      "/cobros",
      "/calendario",
      "/gastos",
      "/recordatorios",
      "/estadisticas",
      "/historial",
      "/configuracion",
    ]);
  });
});

describe("getRouteMeta", () => {
  it("returns route labels for known dashboard sections", () => {
    expect(getRouteMeta("/")).toEqual({
      title: "Dashboard",
      description: "Resumen operativo del estudio",
    });

    expect(getRouteMeta("/configuracion")).toEqual({
      title: "Configuracion",
      description: "Preferencias base del sistema",
    });
  });

  it("falls back to generic copy for unknown routes", () => {
    expect(getRouteMeta("/algo-que-no-existe")).toEqual({
      title: "Panel",
      description: "Base operativa del sistema",
    });
  });
});
