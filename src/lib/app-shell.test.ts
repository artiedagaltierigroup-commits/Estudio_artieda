import { describe, expect, it } from "vitest";
import { dashboardNavigation, getRouteMeta } from "./app-shell";

describe("dashboardNavigation", () => {
  it("includes the base modules for phase 2", () => {
    expect(dashboardNavigation.map((item) => item.href)).toEqual([
      "/",
      "/clientes",
      "/casos",
      "/firmas",
      "/cobros",
      "/calendario",
      "/gastos",
      "/ahorros",
      "/recordatorios",
      "/estadisticas",
      "/historial",
      "/configuracion",
    ]);

    expect(dashboardNavigation.some((item) => item.href === "/firmas" && item.label === "Firmas")).toBe(true);
  });
});

describe("getRouteMeta", () => {
  it("returns route labels for known dashboard sections", () => {
    expect(getRouteMeta("/")).toEqual({
      title: "Dashboard",
      description: "Resumen operativo del estudio",
    });

    expect(getRouteMeta("/configuracion")).toEqual({
      title: "Ayuda",
      description: "Guia operativa del sistema y accesos por modulo",
    });
  });

  it("falls back to generic copy for unknown routes", () => {
    expect(getRouteMeta("/algo-que-no-existe")).toEqual({
      title: "Panel",
      description: "Vista general del estudio",
    });
  });
});
