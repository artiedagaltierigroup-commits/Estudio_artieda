import { getStatisticsFilterOptions, getStatisticsSnapshot } from "@/actions/dashboard";
import { EstadisticasFilters } from "@/components/estadisticas/estadisticas-filters";
import { EstadisticasCharts, StatisticsTrendChartCard } from "@/components/estadisticas/estadisticas-charts";
import { InfoPopover } from "@/components/system/info-popover";
import { MetricCard } from "@/components/system/metric-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { BarChart3, CircleDollarSign, CreditCard, ReceiptText } from "lucide-react";

interface EstadisticasPageProps {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    clientId?: string;
    caseId?: string;
  }>;
}

function buildComparisonHint(metric: {
  amount: number;
  percentage: number;
  direction: "up" | "down" | "flat";
}) {
  if (metric.direction === "flat") return "Sin cambio frente al periodo anterior";
  const sign = metric.direction === "up" ? "+" : "-";
  return `${sign}${Math.abs(metric.percentage)}% vs periodo anterior`;
}

function buildPresetHref(from: string, to: string, filters: { clientId: string; caseId: string }) {
  const params = new URLSearchParams({ from, to });
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.caseId) params.set("caseId", filters.caseId);
  return `/estadisticas?${params.toString()}`;
}

export default async function EstadisticasPage({ searchParams }: EstadisticasPageProps) {
  const now = new Date();
  const params = (await searchParams) ?? {};
  const from = params.from?.trim() || format(startOfMonth(now), "yyyy-MM-dd");
  const to = params.to?.trim() || format(endOfMonth(now), "yyyy-MM-dd");
  const filters = {
    from,
    to,
    clientId: params.clientId?.trim() || "",
    caseId: params.caseId?.trim() || "",
  };

  const [analytics, options] = await Promise.all([
    getStatisticsSnapshot({
      from: filters.from,
      to: filters.to,
      clientId: filters.clientId || undefined,
      caseId: filters.caseId || undefined,
    }),
    getStatisticsFilterOptions(),
  ]);

  const currentMonthFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const currentMonthTo = format(endOfMonth(now), "yyyy-MM-dd");
  const previousMonthDate = subMonths(now, 1);
  const previousMonthFrom = format(startOfMonth(previousMonthDate), "yyyy-MM-dd");
  const previousMonthTo = format(endOfMonth(previousMonthDate), "yyyy-MM-dd");
  const lastThreeMonthsFrom = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
  const lastThreeMonthsTo = currentMonthTo;

  const presets = [
    {
      label: "Este mes",
      href: buildPresetHref(currentMonthFrom, currentMonthTo, filters),
      active: filters.from === currentMonthFrom && filters.to === currentMonthTo,
    },
    {
      label: "Mes anterior",
      href: buildPresetHref(previousMonthFrom, previousMonthTo, filters),
      active: filters.from === previousMonthFrom && filters.to === previousMonthTo,
    },
    {
      label: "Ultimos 3 meses",
      href: buildPresetHref(lastThreeMonthsFrom, lastThreeMonthsTo, filters),
      active: filters.from === lastThreeMonthsFrom && filters.to === lastThreeMonthsTo,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-border/80 bg-white p-4 shadow-[0_24px_60px_-52px_rgba(122,56,79,0.18)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_640px] xl:items-start">
          <div className="space-y-3 pr-4">
            <span className="inline-flex rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/85">
              Lectura del estudio
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Estadisticas
              </h1>
              <InfoPopover
                content="Vista del periodo para entender cuanto entro, cuanto falta, cuanto se gasto y como se compara contra el periodo anterior equivalente."
                className="mt-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(filters.from)} al {formatDate(filters.to)}
              <span className="mx-2 text-border">•</span>
              comparado con {formatDate(analytics.ranges.previous.from)} al {formatDate(analytics.ranges.previous.to)}
            </p>
          </div>
          <EstadisticasFilters filters={filters} options={options} presets={presets} compact />
        </div>
      </section>

      <StatisticsTrendChartCard
        eyebrow="Ganancias"
        title="Ganancias brutas del periodo"
        description="Curva de cobros reales segun el rango activo del filtro, sin descontar gastos."
        data={analytics.trendSeries}
        series={[{ dataKey: "grossIncome", label: "Ganancias brutas", stroke: "#20B7A5", fill: "#20B7A5" }]}
        emptyMessage="Todavia no hay cobros suficientes dentro del periodo para dibujar esta curva."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(32,183,165,0.10))]"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cobrado en el periodo"
          value={formatCurrency(analytics.metrics.collectedIncome.current)}
          subtitle="Pagos registrados dentro del periodo seleccionado."
          hint={buildComparisonHint(analytics.metrics.collectedIncome)}
          icon={CircleDollarSign}
          tone="rose"
        />
        <MetricCard
          label="Pendiente del periodo"
          value={formatCurrency(analytics.metrics.pendingIncome.current)}
          subtitle="Saldo todavia abierto de cobros vinculados al periodo."
          hint={buildComparisonHint(analytics.metrics.pendingIncome)}
          icon={CreditCard}
          tone="amber"
        />
        <MetricCard
          label="Gastos del periodo"
          value={formatCurrency(analytics.metrics.periodExpenses.current)}
          subtitle="Egresos cargados dentro del periodo actual."
          hint={buildComparisonHint(analytics.metrics.periodExpenses)}
          icon={ReceiptText}
          tone="danger"
        />
        <MetricCard
          label="Resultado neto"
          value={formatCurrency(analytics.metrics.netResult.current)}
          subtitle="Cobrado menos gastos del periodo."
          hint={buildComparisonHint(analytics.metrics.netResult)}
          icon={BarChart3}
          tone={analytics.metrics.netResult.current >= 0 ? "sage" : "danger"}
        />
      </div>

      <EstadisticasCharts
        comparisonBars={analytics.comparisonBars}
        trendSeries={analytics.trendSeries}
        movementSeries={analytics.movementSeries}
        expensesByCategory={analytics.expensesByCategory}
        topClients={analytics.topClients}
        topCases={analytics.topCases}
        currentRangeLabel={`${formatDate(analytics.ranges.current.from)} al ${formatDate(analytics.ranges.current.to)}`}
        previousRangeLabel={`${formatDate(analytics.ranges.previous.from)} al ${formatDate(analytics.ranges.previous.to)}`}
      />
    </div>
  );
}
