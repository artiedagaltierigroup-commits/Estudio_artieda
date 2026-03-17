import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CreditCard,
  History,
  LayoutDashboard,
  Receipt,
  Settings,
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
    description: "Seguimiento general de asuntos activos",
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
    description: "Panel interno de alertas y seguimiento",
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
    description: "Auditoria basica de cambios del sistema",
    icon: History,
  },
  {
    href: "/configuracion",
    label: "Configuracion",
    description: "Preferencias base del sistema",
    icon: Settings,
  },
];

export function getRouteMeta(pathname: string) {
  const matchedRoute = dashboardNavigation.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  if (!matchedRoute) {
    return {
      title: "Panel",
      description: "Base operativa del sistema",
    };
  }

  return {
    title: matchedRoute.label,
    description: matchedRoute.description,
  };
}
