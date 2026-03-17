"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNavigation } from "@/lib/app-shell";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 flex-shrink-0 border-r border-border/80 bg-card/90 backdrop-blur md:sticky md:top-0 md:flex md:flex-col">
      <div className="border-b border-border/80 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">Estudio Artieda</p>
            <p className="text-xs text-muted-foreground">Gestion juridica personal</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-[24px] border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">Fase 3</p>
          <p className="mt-1 text-sm text-foreground">
            Sistema visual base en construccion para el uso diario del estudio.
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {dashboardNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-white/15" : "bg-primary/8 text-primary"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-5",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/80 px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Auth, layout y base de datos ya estan listos. Ahora seguimos con experiencia, modulos y detalle.
        </p>
      </div>
    </aside>
  );
}
