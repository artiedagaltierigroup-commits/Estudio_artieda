"use client";

import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import { getRouteMeta } from "@/lib/app-shell";
import { useMoneyVisibility } from "@/components/system/money-visibility-provider";

interface HeaderProps {
  email?: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ email, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const routeMeta = getRouteMeta(pathname);
  const { isMoneyHidden, toggleMoneyVisibility } = useMoneyVisibility();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesion cerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-border/80 bg-card/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
          title={sidebarCollapsed ? "Expandir menu lateral" : "Ocultar menu lateral"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <p className="text-lg font-semibold text-foreground">{routeMeta.title}</p>
      </div>
      <div className="flex items-center gap-4">
        {email && <span className="hidden text-sm text-muted-foreground sm:block">{email}</span>}
        <button
          type="button"
          onClick={toggleMoneyVisibility}
          aria-label={isMoneyHidden ? "Mostrar montos" : "Ocultar montos"}
          aria-pressed={isMoneyHidden}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          suppressHydrationWarning
          title={isMoneyHidden ? "Mostrar montos" : "Ocultar montos"}
        >
          {isMoneyHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          title="Cerrar sesion"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
