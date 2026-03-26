"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNavigation } from "@/lib/app-shell";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
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

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-3" : "px-4")}>
        {dashboardNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
