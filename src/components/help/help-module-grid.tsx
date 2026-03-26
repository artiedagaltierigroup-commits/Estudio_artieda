import type { HelpModule, HelpModuleId } from "@/lib/help-center";
import { ArrowRight, BarChart3, Bell, Briefcase, Calendar, CreditCard, History, LayoutDashboard, Receipt, Repeat, Users } from "lucide-react";
import Link from "next/link";

const moduleIcons: Record<HelpModuleId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  clientes: Users,
  casos: Briefcase,
  cobros: CreditCard,
  calendario: Calendar,
  gastos: Receipt,
  "gastos-recurrentes": Repeat,
  recordatorios: Bell,
  estadisticas: BarChart3,
  historial: History,
};

export function HelpModuleGrid({ modules }: { modules: HelpModule[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => {
        const Icon = moduleIcons[module.id];

        return (
          <Link
            key={module.id}
            href={module.href}
            className="group rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/25"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-base font-semibold text-foreground">{module.label}</p>
              <p className="text-sm leading-6 text-muted-foreground">{module.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
