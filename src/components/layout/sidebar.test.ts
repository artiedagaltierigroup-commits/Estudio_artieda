import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync(new URL("./header.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("./dashboard-shell.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("./sidebar.tsx", import.meta.url), "utf8");

describe("mobile dashboard navigation", () => {
  it("shows an accessible menu button in the header on mobile", () => {
    expect(headerSource).toContain("Menu");
    expect(headerSource).toContain('aria-label="Abrir menu de navegacion"');
    expect(headerSource).toContain("md:hidden");
  });

  it("tracks mobile menu state in the dashboard shell", () => {
    expect(shellSource).toContain("mobileNavigationOpen");
    expect(shellSource).toContain("setMobileNavigationOpen(true)");
    expect(shellSource).toContain("setMobileNavigationOpen(false)");
  });

  it("renders a mobile navigation drawer that can be dismissed", () => {
    expect(sidebarSource).toContain("mobileOpen");
    expect(sidebarSource).toContain("onCloseMobile");
    expect(sidebarSource).toContain("fixed inset-0 z-50 md:hidden");
  });
});
