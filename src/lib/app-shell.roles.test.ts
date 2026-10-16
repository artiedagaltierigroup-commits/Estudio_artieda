import { describe, expect, it } from "vitest";
import { dashboardNavigation, getDashboardNavigation, getRouteMeta } from "./app-shell";

describe("workspace navigation", () => {
  it("preserves every administrator destination", () => {
    expect(getDashboardNavigation("ADMIN")).toEqual(dashboardNavigation);
  });

  it("offers only operational destinations to collaborators", () => {
    expect(getDashboardNavigation("COLLABORATOR").map((item) => item.href)).toEqual([
      "/", "/clientes", "/casos", "/firmas", "/calendario", "/recordatorios", "/configuracion",
    ]);
    expect(JSON.stringify(getDashboardNavigation("COLLABORATOR"))).not.toMatch(/financier|cobros|gastos|ahorros|estadisticas|historial/);
  });

  it("does not show financial route titles for collaborator deep links", () => {
    expect(getRouteMeta("/cobros/nuevo", "COLLABORATOR").title).toBe("Panel");
    expect(getRouteMeta("/clientes/123", "COLLABORATOR").title).toBe("Clientes");
    expect(getRouteMeta("/", "COLLABORATOR").title).toBe("Inicio");
  });
});
