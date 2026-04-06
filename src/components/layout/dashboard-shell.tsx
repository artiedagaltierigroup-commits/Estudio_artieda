"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MoneyVisibilityProvider } from "@/components/system/money-visibility-provider";

const STORAGE_KEY = "estudio-artieda-sidebar-collapsed";

export function DashboardShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  function handleToggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <MoneyVisibilityProvider>
      <div className="flex h-screen overflow-hidden bg-[#fffdfd]">
        <Sidebar collapsed={collapsed} onToggle={handleToggleSidebar} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header email={email} onToggleSidebar={handleToggleSidebar} sidebarCollapsed={collapsed} />
          <main className="flex-1 overflow-y-auto bg-[#fffdfd] p-6">{children}</main>
        </div>
      </div>
    </MoneyVisibilityProvider>
  );
}
