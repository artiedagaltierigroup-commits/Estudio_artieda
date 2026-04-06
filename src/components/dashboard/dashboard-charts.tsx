"use client";

import { useMoneyVisibility } from "@/components/system/money-visibility-provider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/system/section-card";
import { formatDisplayCurrency } from "@/lib/money-visibility";

interface MonthlyNetData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export function DashboardCharts({ monthlyNet }: { monthlyNet: MonthlyNetData[] }) {
  const { isMoneyHidden } = useMoneyVisibility();
  const totalIncome = monthlyNet.reduce((sum, item) => sum + item.income, 0);
  const totalExpenses = monthlyNet.reduce((sum, item) => sum + item.expenses, 0);
  const bestNetMonth = monthlyNet.reduce<MonthlyNetData | null>(
    (current, item) => (current === null || item.net > current.net ? item : current),
    null
  );

  const insights = [
    {
      label: "Ingreso 12 meses",
      value: formatDisplayCurrency(totalIncome, isMoneyHidden),
      detail: "Cobrado real acumulado en la ventana analizada.",
    },
    {
      label: "Gasto 12 meses",
      value: formatDisplayCurrency(totalExpenses, isMoneyHidden),
      detail: "Egresos reales dentro de la misma ventana.",
    },
    {
      label: "Mejor neto",
      value: bestNetMonth ? bestNetMonth.month : "Sin datos",
      detail: bestNetMonth ? formatDisplayCurrency(bestNetMonth.net, isMoneyHidden) : "Todavia no hay movimientos.",
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.95fr)]">
      <SectionCard
        eyebrow="Tendencia"
        title="Ingresos vs gastos"
        description="Comparativa mensual entre entradas reales y egresos reales."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))]"
      >
        {monthlyNet.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Aun no hay movimientos suficientes para mostrar la comparativa mensual.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyNet} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(138,124,132,0.16)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatDisplayCurrency(value, isMoneyHidden),
                  name === "income" ? "Ingresos" : "Gastos",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid rgba(223, 208, 215, 0.85)",
                  borderRadius: "18px",
                  fontSize: "12px",
                  boxShadow: "0 24px 60px -40px rgba(135, 92, 111, 0.45)",
                }}
              />
              <Bar dataKey="income" fill="#C76C8A" radius={[10, 10, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses" fill="#D96C6C" radius={[10, 10, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Lectura rapida"
        title="Pulso anual"
        description="Tres referencias para leer tendencia sin abrir estadisticas."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(201,182,228,0.12))]"
        contentClassName="space-y-3"
      >
        {insights.map((item) => (
          <div
            key={item.label}
            className="rounded-[24px] border border-border/70 bg-white/80 px-4 py-4 shadow-[0_18px_50px_-40px_rgba(135,92,111,0.42)]"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
