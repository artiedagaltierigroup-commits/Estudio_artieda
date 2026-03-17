import { getDashboardMetrics, getMonthlyIncomeChart } from "@/actions/dashboard";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { formatCurrency } from "@/lib/utils";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart2,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to = format(endOfMonth(now), "yyyy-MM-dd");

  const [metrics, chartData] = await Promise.all([
    getDashboardMetrics({ from, to }),
    getMonthlyIncomeChart(12),
  ]);

  const cards = [
    {
      label: "Ingresos esperados",
      value: formatCurrency(metrics.expectedIncome),
      subtitle: "Honorarios con vencimiento dentro del mes actual.",
      icon: Calendar,
      tone: "rose" as const,
    },
    {
      label: "Ingresos cobrados",
      value: formatCurrency(metrics.collectedIncome),
      subtitle: "Entradas reales registradas durante este periodo.",
      icon: TrendingUp,
      tone: "sage" as const,
    },
    {
      label: "Pendiente de cobro",
      value: formatCurrency(metrics.pendingIncome),
      subtitle: "Saldo vivo que sigue necesitando seguimiento.",
      icon: Clock,
      tone: "amber" as const,
    },
    {
      label: "Gastos del mes",
      value: formatCurrency(metrics.periodExpenses + metrics.projectedRecurring),
      subtitle: "Suma de gastos cargados y recurrentes proyectados.",
      icon: TrendingDown,
      tone: "danger" as const,
    },
    {
      label: "Resultado neto",
      value: formatCurrency(metrics.netResult),
      subtitle: "Cobrado real menos gastos del periodo.",
      icon: Wallet,
      tone: metrics.netResult >= 0 ? ("sage" as const) : ("danger" as const),
    },
    {
      label: "Ganancia bruta total",
      value: formatCurrency(metrics.grossIncome),
      subtitle: "Todo lo cobrado historicamente, sin descontar gastos.",
      icon: DollarSign,
      tone: "lilac" as const,
    },
    {
      label: "Ganancia neta total",
      value: formatCurrency(metrics.netIncome),
      subtitle: "Lectura historica luego de egresos cargados.",
      icon: BarChart2,
      tone: metrics.netIncome >= 0 ? ("slate" as const) : ("danger" as const),
    },
    {
      label: "Mejor cliente",
      value: metrics.topClient?.name ?? "Sin datos",
      subtitle: metrics.topClient ? formatCurrency(metrics.topClient.total) : "Todavia sin historial suficiente.",
      icon: Star,
      tone: "rose" as const,
    },
  ];

  const periodLabel = format(now, "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vista general"
        title="Dashboard financiero"
        description="Una lectura serena del estudio: que entra, que sigue pendiente y donde conviene poner foco esta semana."
        stats={[
          { label: "Periodo", value: periodLabel },
          { label: "Mejor mes", value: metrics.topMonth?.month ?? "Sin datos" },
          { label: "Cliente destacado", value: metrics.topClient?.name ?? "Sin datos" },
          { label: "Proyeccion fija", value: formatCurrency(metrics.projectedRecurring) },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <DashboardCharts chartData={chartData} />

      <SectionCard
        eyebrow="Enfoque sugerido"
        title="Lo que conviene mirar a continuacion"
        description="Este bloque deja visibles los tres datos que suelen disparar seguimiento comercial o financiero."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))]"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-[#8f4e68]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Pendiente vivo</p>
                <p className="text-xs text-muted-foreground">Cobros que todavia requieren accion.</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {formatCurrency(metrics.pendingIncome)}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <p className="text-sm font-semibold text-foreground">Resultado del mes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Diferencia entre lo cobrado y lo que ya se fue en gastos.
            </p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {formatCurrency(metrics.netResult)}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <p className="text-sm font-semibold text-foreground">Cliente con mas traccion</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Referencia rapida para entender donde se concentra la facturacion.
            </p>
            <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
              {metrics.topClient?.name ?? "Sin datos suficientes"}
            </p>
            {metrics.topClient ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {formatCurrency(metrics.topClient.total)} acumulados.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
