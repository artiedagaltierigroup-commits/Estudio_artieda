"use client";

import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getRouteMeta } from "@/lib/app-shell";

interface HeaderProps {
  email?: string;
}

export function Header({ email }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const routeMeta = getRouteMeta(pathname);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesion cerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-border/80 bg-card/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-lg font-semibold text-foreground">{routeMeta.title}</p>
        <p className="text-sm text-muted-foreground">{routeMeta.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground lg:flex">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          Operacion diaria
        </div>
        {email && <span className="hidden text-sm text-muted-foreground sm:block">{email}</span>}
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
