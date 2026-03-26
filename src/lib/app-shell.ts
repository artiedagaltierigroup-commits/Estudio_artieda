import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CircleHelp,
  CreditCard,
  History,
  LayoutDashboard,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const dashboardNavigation: DashboardNavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Resumen operativo del estudio",
    icon: LayoutDashboard,
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Base de clientes y relacion comercial",
    icon: Users,
  },
  {
    href: "/casos",
    label: "Casos",
    description: "Expedientes abiertos, cerrados y en curso",
    icon: Briefcase,
  },
  {
    href: "/cobros",
    label: "Cobros",
    description: "Cobros pactados, pendientes y parciales",
    icon: CreditCard,
  },
  {
    href: "/calendario",
    label: "Calendario",
    description: "Vista temporal de vencimientos y alertas",
    icon: Calendar,
  },
  {
    href: "/gastos",
    label: "Gastos",
    description: "Control de egresos y proyecciones",
    icon: Receipt,
  },
  {
    href: "/recordatorios",
    label: "Recordatorios",
    description: "Alertas internas y tareas pendientes",
    icon: Bell,
  },
  {
    href: "/estadisticas",
    label: "Estadisticas",
    description: "Metricas financieras y evolucion mensual",
    icon: BarChart3,
  },
  {
    href: "/historial",
    label: "Historial",
    description: "Cambios recientes sobre la informacion",
    icon: History,
  },
  {
    href: "/configuracion",
    label: "Ayuda",
    description: "Guia operativa del sistema y accesos por modulo",
    icon: CircleHelp,
  },
];

export function getRouteMeta(pathname: string) {
  const matchedRoute = dashboardNavigation.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  if (!matchedRoute) {
    return {
      title: "Panel",
      description: "Vista general del estudio",
    };
  }

  return {
    title: matchedRoute.label,
    description: matchedRoute.description,
  };
}
