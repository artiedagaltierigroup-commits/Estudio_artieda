"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNavigation } from "@/lib/app-shell";

function NavigationLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-3" : "px-4")}>
      {dashboardNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex rounded-2xl px-4 py-3 text-sm transition-colors",
              collapsed ? "justify-center" : "items-center gap-3",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={item.label}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-white/15" : "bg-primary/8 text-primary"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
            </span>
            {!collapsed ? <span className="block font-medium">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggle,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggle: () => void;
}) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-screen flex-shrink-0 border-r border-border/80 bg-white/95 backdrop-blur md:sticky md:top-0 md:flex md:flex-col",
          collapsed ? "w-[92px]" : "w-72"
        )}
      >
        <div className={cn("border-b border-border/80 py-6", collapsed ? "px-4" : "px-6")}>
          <button
            type="button"
            onClick={onToggle}
            className={cn("flex items-center rounded-2xl", collapsed ? "justify-center" : "gap-3")}
            title={collapsed ? "Expandir menu" : "Colapsar menu"}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-sm">
              <Scale className="h-5 w-5 text-white" />
            </div>
            {!collapsed ? (
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight text-foreground">Estudio Artieda</p>
                <p className="text-xs text-muted-foreground">Gestion juridica personal</p>
              </div>
            ) : null}
          </button>
        </div>

        <NavigationLinks collapsed={collapsed} />
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegacion"
        >
          <button
            type="button"
            aria-label="Cerrar menu de navegacion"
            className="absolute inset-0 h-full w-full bg-foreground/30"
            onClick={onCloseMobile}
          />
          <div className="relative flex h-full w-[min(86vw,340px)] flex-col border-r border-border/80 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-sm">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground">Estudio Artieda</p>
                  <p className="text-xs text-muted-foreground">Gestion juridica personal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar menu de navegacion"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                title="Cerrar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NavigationLinks collapsed={false} onNavigate={onCloseMobile} />
          </div>
        </div>
      ) : null}
    </>
  );
}
