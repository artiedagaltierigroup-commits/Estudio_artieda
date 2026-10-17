import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page";
import ClientsPage from "./clientes/page";
import ClientPage from "./clientes/[id]/page";
import CasesPage from "./casos/page";
import CasePage from "./casos/[id]/page";
import NewCasePage from "./casos/nuevo/page";
import EditCasePage from "./casos/[id]/editar/page";
import CalendarPage from "./calendario/page";
import RemindersPage from "./recordatorios/page";
import { CreateReminderForm } from "@/components/reminders/create-reminder-dialog";

const state = vi.hoisted(() => ({
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
  finance: vi.fn(() => { throw new Error("Financial reader reached by collaborator"); }),
  operationalClients: vi.fn(async () => []),
  operationalCase: vi.fn(async () => ({ id: "case-id", title: "Caso de prueba", clientId: "client-id" })),
}));

vi.mock("@/lib/workspace-access", () => ({ getWorkspaceAccess: async () => ({ actorUserId: state.role === "ADMIN" ? "owner" : "staff", ownerUserId: "owner", displayName: state.role === "ADMIN" ? "Victoria" : "Brisa", role: state.role }) }));
vi.mock("@/actions/dashboard", () => ({ getAnalyticsSnapshot: state.finance, getDashboardOverview: state.finance }));
vi.mock("@/actions/clients", () => ({ getClients: state.finance, getClient: state.finance, createClientInlineAction: vi.fn() }));
vi.mock("@/actions/cases", () => ({ getCases: state.finance, getCase: state.finance, getCaseRecord: state.finance, createCase: vi.fn(), updateCase: vi.fn() }));
vi.mock("@/actions/calendar", () => ({ getCalendarEvents: state.finance }));
vi.mock("@/actions/operational", () => ({ getOperationalClients: state.operationalClients, getOperationalCase: state.operationalCase, getOperationalCases: vi.fn(async () => []), getOperationalClient: vi.fn() }));
vi.mock("@/actions/recurring-expense-occurrences", () => ({ getRecurringPayableChecklist: state.finance, getRecurringPayableAlerts: state.finance, markRecurringOccurrencePaid: vi.fn(), reopenRecurringOccurrence: vi.fn() }));
vi.mock("@/actions/reminders", () => ({ getReminders: vi.fn(async () => []), getReminderReferences: vi.fn(async () => ({ clients: [], cases: [], assistants: [{ userId: "staff", displayName: "Brisa" }] })), createReminder: vi.fn(), completeReminder: vi.fn(), reopenReminder: vi.fn(), deleteReminder: vi.fn() }));

describe("collaborator page data boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); state.role = "COLLABORATOR"; });

  it.each([
    ["home", () => HomePage()],
    ["client list", () => ClientsPage({ searchParams: Promise.resolve({ q: "test" }) })],
    ["client detail", () => ClientPage({ params: Promise.resolve({ id: "client-id" }) })],
    ["case list", () => CasesPage({ searchParams: Promise.resolve({ q: "test", chargeStatus: "OVERDUE" }) })],
    ["case detail", () => CasePage({ params: Promise.resolve({ id: "case-id" }) })],
    ["calendar", () => CalendarPage({ searchParams: Promise.resolve({ month: "2026-10" }) })],
    ["reminders", () => RemindersPage()],
  ] as const)("branches before financial reads on %s", async (_name, page) => {
    expect(await page()).toBeTruthy();
    expect(state.finance).not.toHaveBeenCalled();
  });

  it("loads case creation references through operational readers", async () => {
    expect(await NewCasePage({ searchParams: Promise.resolve({}) })).toBeTruthy();
    expect(state.operationalClients).toHaveBeenCalledOnce();
    expect(state.finance).not.toHaveBeenCalled();
  });

  it("loads case editing values through operational readers", async () => {
    expect(await EditCasePage({ params: Promise.resolve({ id: "case-id" }) })).toBeTruthy();
    expect(state.operationalCase).toHaveBeenCalledWith("case-id");
    expect(state.operationalClients).toHaveBeenCalledOnce();
    expect(state.finance).not.toHaveBeenCalled();
  });

  it("shows Brisa her automatic assignment without a reassignment control", async () => {
    const html = renderToStaticMarkup(<CreateReminderForm action={vi.fn()} role="COLLABORATOR" displayName="Brisa" references={{ clients: [], cases: [], assistants: [{ userId: "staff", displayName: "Brisa" }] }} />);
    expect(html).toContain("Esta tarea quedará asignada a Brisa");
    expect(html).not.toContain('name="assigneeUserId"');
  });

  it("lets Victoria choose herself or Brisa", async () => {
    const html = renderToStaticMarkup(<CreateReminderForm action={vi.fn()} role="ADMIN" displayName="Victoria" references={{ clients: [], cases: [], assistants: [{ userId: "staff", displayName: "Brisa" }] }} />);
    expect(html).toContain('name="assigneeUserId"');
    expect(html).toContain("Solo para Victoria");
    expect(html).toContain("Brisa");
  });

  it("shows task creation in the header without the old fixed cards", async () => {
    const html = renderToStaticMarkup(await RemindersPage());
    expect(html).toContain("Nueva tarea");
    expect(html).not.toContain("Alta rapida");
    expect(html).not.toContain("Como leer el panel");
  });
});
