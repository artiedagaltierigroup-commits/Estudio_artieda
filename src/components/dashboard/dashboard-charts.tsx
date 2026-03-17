"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SectionCard } from "@/components/system/section-card";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
  month: string;
  total: number;
}

export function DashboardCharts({ chartData }: { chartData: ChartData[] }) {
  const total = chartData.reduce((sum, item) => sum + item.total, 0);
  const average = chartData.length > 0 ? total / chartData.length : 0;
  const bestMonth = chartData.reduce<ChartData | null>(
    (current, item) => (current === null || item.total > current.total ? item : current),
    null
  );
  const latestMonth = chartData[chartData.length - 1] ?? null;

  const insights = [
    {
      label: "Promedio",
      value: formatCurrency(average),
      detail: "Ingreso mensual de los ultimos 12 meses.",
    },
    {
      label: "Mejor tramo",
      value: bestMonth ? bestMonth.month : "Sin datos",
      detail: bestMonth ? formatCurrency(bestMonth.total) : "Todavia no hay pagos registrados.",
    },
    {
      label: "Ultimo mes",
      value: latestMonth ? formatCurrency(latestMonth.total) : "$0",
      detail: latestMonth ? latestMonth.month : "Sin movimientos.",
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.95fr)]">
      <SectionCard
        eyebrow="Tendencia"
        title="Ingresos mensuales"
        description="Lectura rapida de los pagos registrados durante los ultimos doce meses."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))]"
      >
        {chartData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Aun no hay pagos suficientes para mostrar una curva mensual.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(138,124,132,0.16)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Cobrado"]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid rgba(223, 208, 215, 0.85)",
                  borderRadius: "18px",
                  fontSize: "12px",
                  boxShadow: "0 24px 60px -40px rgba(135, 92, 111, 0.45)",
                }}
                cursor={{ fill: "rgba(247, 214, 224, 0.34)" }}
              />
              <Bar dataKey="total" fill="#C76C8A" radius={[10, 10, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Lectura rapida"
        title="Pulso del periodo"
        description="Tres referencias para mirar el rendimiento sin abrir modulos extra."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(201,182,228,0.12))]"
        contentClassName="space-y-3"
      >
        {insights.map((item) => (
          <div
            key={item.label}
            className="rounded-[24px] border border-border/70 bg-white/80 px-4 py-4 shadow-[0_18px_50px_-40px_rgba(135,92,111,0.42)]"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
