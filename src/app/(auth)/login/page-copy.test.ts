import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginPageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("login page copy", () => {
  it("uses legal-practice language instead of infrastructure terms", () => {
    expect(loginPageSource).toContain("Organiza clientes, causas, cobros, gastos y recordatorios en un solo lugar");
    expect(loginPageSource).toContain("el trabajo interno del estudio.");
    expect(loginPageSource).toContain("Ingreso seguro para la gestion interna y la consulta diaria.");

    expect(loginPageSource).not.toContain("Supabase con acceso privado");
    expect(loginPageSource).not.toContain("Drizzle sobre Postgres de Supabase");
    expect(loginPageSource).not.toContain("Dashboard listo para crecer por modulos");
    expect(loginPageSource).not.toContain("Confidencialidad");
    expect(loginPageSource).not.toContain("Seguimiento");
    expect(loginPageSource).not.toContain("Gestion diaria");
  });
});
