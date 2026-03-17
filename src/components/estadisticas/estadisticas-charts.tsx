"use client";

import { SectionCard } from "@/components/system/section-card";
import { formatCurrency } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  chartData: { month: string; total: number }[];
  expensesByType: { name: string; value: number }[];
  chargesByStatus: { name: string; value: number; color: string }[];
}

const EXPENSE_COLORS = ["#C76C8A", "#D96C6C", "#7BBE9E", "#C9B6E4"];

export function EstadisticasCharts({ chartData, expensesByType, chargesByStatus }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        eyebrow="Ingresos"
        title="Evolucion mensual"
        description="Los ultimos doce meses para leer tendencia sin entrar a filtros avanzados."
        className="lg:col-span-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))]"
      >
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
              formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
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
      </SectionCard>

      <SectionCard
        eyebrow="Gastos"
        title="Distribucion por tipo"
        description="Permite distinguir rapidamente que categoria esta empujando el gasto."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(201,182,228,0.12))]"
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={expensesByType}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={82}
              innerRadius={44}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={11}
            >
              {expensesByType.map((_, index) => (
                <Cell key={index} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        eyebrow="Cobros"
        title="Distribucion por estado"
        description="Lectura rapida del mix entre cobros pagados, parciales, pendientes y vencidos."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(123,190,158,0.12))]"
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chargesByStatus}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={82}
              innerRadius={44}
              label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
              labelLine={false}
              fontSize={11}
            >
              {chargesByStatus.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}
