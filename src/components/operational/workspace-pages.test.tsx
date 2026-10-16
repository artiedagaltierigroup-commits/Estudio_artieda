import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationalCasePage, OperationalClientPage, OperationalHome, OperationalHelp } from "./workspace-pages";

const fixtures = vi.hoisted(() => {
  const client = { id: "client", name: "Cliente de prueba", taxId: null, email: "test@example.com", phone: null, address: null, languages: null, notes: "Nota compartida de cobro", cases: [], reminders: [] };
  const caseItem = { id: "case", clientId: "client", title: "Expediente de prueba", description: "Contexto compartido", status: "ACTIVE", priority: "MEDIUM", startDate: "2026-10-16", endDate: null, client, reminders: [] };
  return { client, caseItem };
});
vi.mock("@/actions/operational", () => ({
  getOperationalClient: vi.fn(async () => fixtures.client), getOperationalClients: vi.fn(async () => [fixtures.client]),
  getOperationalCase: vi.fn(async () => fixtures.caseItem), getOperationalCases: vi.fn(async () => [fixtures.caseItem]),
}));
vi.mock("@/actions/reminders", () => ({ getReminders: vi.fn(async () => []) }));

describe("operational pages", () => {
  it("renders shared client notes and editing without financial or deletion actions", async () => {
    const html = renderToStaticMarkup(await OperationalClientPage({ id: "client" }));
    expect(html).toContain("Nota compartida de cobro");
    expect(html).toContain('href="/clientes/client/editar"');
    expect(html).toContain("Nueva solicitud de firma");
    expect(html).not.toMatch(/Deuda|Saldo|Cobrado|Eliminar|\/cobros/);
  });
  it("renders the operational case fields and edit link", async () => {
    const html = renderToStaticMarkup(await OperationalCasePage({ id: "case" }));
    expect(html).toContain("Expediente de prueba");
    expect(html).toContain("Contexto compartido");
    expect(html).toContain('href="/casos/case/editar"');
    expect(html).not.toMatch(/Honorarios|Saldo|Cobrado|Eliminar|\/cobros/);
  });
  it("renders a work agenda on the home page", async () => {
    const html = renderToStaticMarkup(await OperationalHome());
    expect(html).toContain("Tareas pendientes");
    expect(html).toContain("Casos activos");
    expect(html).not.toMatch(/Gastos|Ahorros|Cobros|Ingresos|Estadisticas/);
  });
  it("limits help content to shared workflows", () => {
    const html = renderToStaticMarkup(<OperationalHelp />);
    expect(html).toContain("Tareas");
    expect(html).not.toMatch(/cobros|gastos|ahorros|estadisticas|historial/i);
  });
});
