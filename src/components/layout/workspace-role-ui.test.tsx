import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CaseForm } from "@/components/cases/case-form";
import { ClientForm } from "@/components/clients/client-form";
import { WorkspaceRoleProvider } from "@/components/system/workspace-role-provider";
import { MoneyVisibilityProvider } from "@/components/system/money-visibility-provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/clientes", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("@/actions/clients", () => ({ createClientInlineAction: vi.fn() }));

describe("workspace role presentation", () => {
  it("filters both desktop and open mobile navigation", () => {
    const html = renderToStaticMarkup(<WorkspaceRoleProvider role="COLLABORATOR"><Sidebar collapsed={false} mobileOpen onCloseMobile={() => {}} onToggle={() => {}} /></WorkspaceRoleProvider>);
    expect(html.match(/href="\/clientes"/g)).toHaveLength(2);
    for (const destination of ["cobros", "gastos", "ahorros", "estadisticas", "historial"]) expect(html).not.toContain(`href="/${destination}"`);
  });

  it.each(["ADMIN", "COLLABORATOR"] as const)("only gives ADMIN the money visibility control (%s)", (role) => {
    const html = renderToStaticMarkup(<WorkspaceRoleProvider role={role}><MoneyVisibilityProvider><Header displayName={role === "ADMIN" ? "Victoria" : "Brisa"} sidebarCollapsed={false} onToggleSidebar={() => {}} onOpenMobileNavigation={() => {}} /></MoneyVisibilityProvider></WorkspaceRoleProvider>);
    expect(html.includes("Ocultar montos")).toBe(role === "ADMIN");
    expect(html).toContain("Cerrar sesion");
  });

  it.each(["ADMIN", "COLLABORATOR"] as const)("only submits financial case controls for ADMIN (%s)", (role) => {
    const html = renderToStaticMarkup(<CaseForm role={role} action={() => {}} cancelHref="/casos" submitLabel="Guardar" clients={[]} initialValues={{ fee: "123456", preferredPaymentMethod: "SECRETO" }} />);
    expect(html.includes('name="fee"')).toBe(role === "ADMIN");
    expect(html.includes('name="preferredPaymentMethod"')).toBe(role === "ADMIN");
    expect(html.includes("SECRETO")).toBe(role === "ADMIN");
    expect(html.includes("cobros y pagos")).toBe(role === "ADMIN");
    expect(html).toContain('name="title"');
  });

  it("shares existing free text but does not describe financial modules in the collaborator client form", () => {
    const html = renderToStaticMarkup(<ClientForm role="COLLABORATOR" action={() => {}} cancelHref="/clientes" submitLabel="Guardar" initialValues={{ notes: "Texto compartido: cobro acordado" }} />);
    expect(html).toContain("Texto compartido: cobro acordado");
    expect(html).not.toContain("casos, cobros");
    expect(html).not.toContain("metricas del dashboard");
  });
});
