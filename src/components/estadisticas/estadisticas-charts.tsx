"use client";

import { SectionCard } from "@/components/system/section-card";
import { useMoneyVisibility } from "@/components/system/money-visibility-provider";
import { formatDisplayCurrency } from "@/lib/money-visibility";
import { formatStatisticsAxisValue, getHorizontalBarChartHeight } from "@/lib/statistics-presentation";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ComparisonDatum {
  label: string;
  current: number;
  previous: number;
}

interface TrendDatum {
  label: string;
  grossIncome: number;
  expenses: number;
}

interface MovementDatum {
  label: string;
  collected: number;
  expenses: number;
}

interface ExpenseCategoryDatum {
  name: string;
  value: number;
  percentage: number;
}

interface TopClientDatum {
  clientId: string;
  clientName: string;
  collected: number;
  balance: number;
}

interface TopCaseDatum {
  caseId: string;
  caseTitle: string;
  clientName: string;
  collected: number;
}

interface TrendSeriesDefinition {
  dataKey: "grossIncome" | "expenses";
  label: string;
  stroke: string;
  fill: string;
}

interface StatisticsTrendChartCardProps {
  eyebrow: string;
  title: string;
  description: string;
  data: TrendDatum[];
  series: TrendSeriesDefinition[];
  emptyMessage: string;
  className?: string;
}

interface Props {
  comparisonBars: ComparisonDatum[];
  trendSeries: TrendDatum[];
  movementSeries: MovementDatum[];
  expensesByCategory: ExpenseCategoryDatum[];
  topClients: TopClientDatum[];
  topCases: TopCaseDatum[];
  currentRangeLabel: string;
  previousRangeLabel: string;
}

const tooltipContentStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.98)",
  border: "1px solid rgba(223, 208, 215, 0.85)",
  borderRadius: "18px",
  fontSize: "12px",
  boxShadow: "0 24px 60px -40px rgba(135, 92, 111, 0.45)",
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function RangeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/70 bg-white px-3 py-1.5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function hasTrendData(data: TrendDatum[], series: TrendSeriesDefinition[]) {
  return data.some((item) => series.some((definition) => item[definition.dataKey] > 0));
}

export function StatisticsTrendChartCard({
  eyebrow,
  title,
  description,
  data,
  series,
  emptyMessage,
  className,
}: StatisticsTrendChartCardProps) {
  const { isMoneyHidden } = useMoneyVisibility();
  const chartId = useId().replace(/:/g, "");
  const showDots = data.length <= 12;

  return (
    <SectionCard eyebrow={eyebrow} title={title} description={description} className={className}>
      {!hasTrendData(data, series) ? (
        <EmptyChart message={emptyMessage} />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.dataKey} id={`${chartId}-${item.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.fill} stopOpacity={series.length === 1 ? 0.34 : 0.22} />
                  <stop offset="95%" stopColor={item.fill} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(138,124,132,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={formatStatisticsAxisValue}
              tick={{ fontSize: 11, fill: "#8A7C84" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatDisplayCurrency(value, isMoneyHidden), name]}
              contentStyle={tooltipContentStyle}
            />
            {series.length > 1 ? (
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }} />
            ) : null}
            {series.map((item) => (
              <Area
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                name={item.label}
                stroke={item.stroke}
                strokeWidth={3}
                fill={`url(#${chartId}-${item.dataKey})`}
                fillOpacity={1}
                dot={showDots ? { r: 3, fill: item.stroke, strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: item.stroke, stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

export function EstadisticasCharts({
  comparisonBars,
  trendSeries,
  movementSeries,
  expensesByCategory,
  topClients,
  topCases,
  currentRangeLabel,
  previousRangeLabel,
}: Props) {
  const { isMoneyHidden } = useMoneyVisibility();
  const topClientsHeight = getHorizontalBarChartHeight(Math.min(topClients.length || 1, 6));
  const topCasesHeight = getHorizontalBarChartHeight(Math.min(topCases.length || 1, 6));
  const expensesHeight = getHorizontalBarChartHeight(Math.min(expensesByCategory.length || 1, 6));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        eyebrow="Periodo"
        title="Actual vs periodo anterior"
        description="Comparacion directa entre lo cobrado, lo gastado y lo que quedo del periodo seleccionado frente al periodo anterior equivalente."
        actions={
          <>
            <RangeBadge label="Actual" value={currentRangeLabel} />
            <RangeBadge label="Anterior" value={previousRangeLabel} />
          </>
        }
        className="xl:col-span-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.14))]"
      >
        {comparisonBars.every((item) => item.current === 0 && item.previous === 0) ? (
          <EmptyChart message="Todavia no hay movimientos suficientes para comparar este periodo con el anterior." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={comparisonBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(138,124,132,0.16)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatStatisticsAxisValue} tick={{ fontSize: 11, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number, key: string) => [
                  formatDisplayCurrency(value, isMoneyHidden),
                  key === "current" ? "Periodo actual" : "Periodo anterior",
                ]}
                contentStyle={tooltipContentStyle}
              />
              <Bar dataKey="previous" name="Periodo anterior" fill="#E8CBD5" radius={[10, 10, 0, 0]} maxBarSize={34} />
              <Bar dataKey="current" name="Periodo actual" fill="#C76C8A" radius={[10, 10, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Clientes"
        title="Top clientes por cobrado"
        description="Clientes que mas ingreso efectivo generaron dentro del periodo seleccionado."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(123,190,158,0.12))]"
      >
        {topClients.length === 0 ? (
          <EmptyChart message="Todavia no hay cobranzas suficientes para armar un ranking de clientes." />
        ) : (
          <ResponsiveContainer width="100%" height={topClientsHeight}>
            <BarChart data={topClients} layout="vertical" margin={{ top: 8, right: 20, left: 24, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="rgba(138,124,132,0.10)" />
              <XAxis type="number" tickFormatter={formatStatisticsAxisValue} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="clientName"
                width={160}
                tick={{ fontSize: 12, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatDisplayCurrency(value, isMoneyHidden), "Cobrado"]}
                contentStyle={tooltipContentStyle}
              />
              <Bar dataKey="collected" fill="#7BBE9E" radius={[0, 12, 12, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Casos"
        title="Top casos por cobrado"
        description="Expedientes que mas ingreso real generaron en el periodo actual."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,251,0.92))]"
      >
        {topCases.length === 0 ? (
          <EmptyChart message="Todavia no hay casos con cobros suficientes para compararlos." />
        ) : (
          <ResponsiveContainer width="100%" height={topCasesHeight}>
            <BarChart data={topCases} layout="vertical" margin={{ top: 8, right: 20, left: 24, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="rgba(138,124,132,0.10)" />
              <XAxis type="number" tickFormatter={formatStatisticsAxisValue} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="caseTitle"
                width={160}
                tick={{ fontSize: 12, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, _name, item) => [
                  formatDisplayCurrency(value, isMoneyHidden),
                  item.payload.caseTitle,
                ]}
                labelFormatter={(_label, payload) => payload?.[0]?.payload.clientName ?? ""}
                contentStyle={tooltipContentStyle}
              />
              <Bar dataKey="collected" fill="#C76C8A" radius={[0, 12, 12, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <StatisticsTrendChartCard
        eyebrow="Gastos"
        title="Gastos del periodo"
        description="Linea temporal de egresos reales segun el periodo definido en el filtro."
        data={trendSeries}
        series={[{ dataKey: "expenses", label: "Gastos", stroke: "#6674F4", fill: "#6674F4" }]}
        emptyMessage="Todavia no hay gastos suficientes dentro del periodo para dibujar esta curva."
        className="xl:col-span-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(102,116,244,0.10))]"
      />

      <SectionCard
        eyebrow="Gastos"
        title="Distribucion por categoria"
        description="Categorias que mas peso tuvieron dentro del gasto del periodo."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(217,108,108,0.08))]"
      >
        {expensesByCategory.length === 0 ? (
          <EmptyChart message="Todavia no hay gastos cargados para leer la distribucion por categoria." />
        ) : (
          <ResponsiveContainer width="100%" height={expensesHeight}>
            <BarChart
              data={expensesByCategory}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 24, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="rgba(138,124,132,0.10)" />
              <XAxis type="number" tickFormatter={formatStatisticsAxisValue} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 12, fill: "#8A7C84" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, _name, item) => [
                  `${formatDisplayCurrency(value, isMoneyHidden)} (${item.payload.percentage}%)`,
                  item.payload.name,
                ]}
                contentStyle={tooltipContentStyle}
              />
              <Bar dataKey="value" fill="#D96C6C" radius={[0, 12, 12, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Cruce"
        title="Cobrado vs gastos"
        description="Movimiento del periodo actual para ver de un vistazo cuanto entro y cuanto salio."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(233,211,219,0.28))]"
      >
        {movementSeries.length === 0 ? (
          <EmptyChart message="No hay movimiento suficiente dentro del periodo para construir este cruce." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={movementSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(138,124,132,0.16)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatStatisticsAxisValue} tick={{ fontSize: 11, fill: "#8A7C84" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number, key: string) => [
                  formatDisplayCurrency(value, isMoneyHidden),
                  key === "collected" ? "Cobrado" : "Gastos",
                ]}
                contentStyle={tooltipContentStyle}
              />
              <Bar dataKey="collected" fill="#C76C8A" radius={[10, 10, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" fill="#D96C6C" radius={[10, 10, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <StatisticsTrendChartCard
        eyebrow="Cruce"
        title="Ganancias brutas vs gastos"
        description="Comparativa temporal entre el cobrado real y los gastos del periodo filtrado."
        data={trendSeries}
        series={[
          { dataKey: "grossIncome", label: "Ganancias brutas", stroke: "#20B7A5", fill: "#20B7A5" },
          { dataKey: "expenses", label: "Gastos", stroke: "#6674F4", fill: "#6674F4" },
        ]}
        emptyMessage="Todavia no hay movimientos suficientes para contrastar ganancias brutas contra gastos."
        className="xl:col-span-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(233,241,248,0.32))]"
      />
    </div>
  );
}
