import { getExpenses } from "@/actions/expenses";
import { getRecurringExpenses } from "@/actions/recurring-expenses";
import { getDashboardOverview } from "@/actions/dashboard";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildExpenseMonthBoard, summarizeExpenseMetrics } from "@/lib/expense-insights";
import { formatCurrency, formatDate, getExpenseTypeLabel } from "@/lib/utils";
import { Plus, Receipt, RefreshCcw, Search, Wallet } from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface GastosPageProps {
  searchParams?: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function GastosPage({ searchParams }: GastosPageProps) {
  const params = (await searchParams) ?? {};
  const filters = {
    query: params.q?.trim() ?? "",
    type: params.type?.trim() ?? "",
  };
  const today = new Date();
  const from = format(startOfMonth(today), "yyyy-MM-dd");
  const to = format(endOfMonth(today), "yyyy-MM-dd");

  const [expenseList, recurringList, monthOverview] = await Promise.all([
    getExpenses(filters),
    getRecurringExpenses(),
    getDashboardOverview({ from, to }),
  ]);
  const metrics = summarizeExpenseMetrics({ expenses: expenseList, recurring: recurringList });
  const monthBoard = buildExpenseMonthBoard({
    expectedIncome: monthOverview.metrics.expectedIncome,
    collectedIncome: monthOverview.metrics.collectedIncome,
    periodExpenses: monthOverview.metrics.periodExpenses,
  });
  const monthLabel = format(today, "MMMM yyyy");
  const moneyBase = Math.max(
    monthOverview.metrics.collectedIncome,
    monthOverview.metrics.expectedIncome,
    monthOverview.metrics.periodExpenses,
    1
  );
  const collectedWidth = Math.min(100, (monthOverview.metrics.collectedIncome / moneyBase) * 100);
  const expenseWidth = Math.min(100, (monthOverview.metrics.periodExpenses / moneyBase) * 100);
  const realTone =
    monthBoard.realAvailable > 0 ? "text-emerald-700" : monthBoard.realAvailable < 0 ? "text-rose-700" : "text-foreground";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Egresos"
        title="Gastos"
        description="Control mensual para registrar gastos y ver cuanto queda realmente disponible despues de cobrarlos."
        stats={[
          { label: "Registros", value: `${expenseList.length}` },
          { label: "Operativos", value: `${metrics.operativeCount}` },
          { label: "Total cargado", value: formatCurrency(metrics.totalExpenses) },
          { label: "Recurrentes activos", value: `${metrics.activeRecurringCount}` },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gastos/recurrentes">
                <RefreshCcw className="h-4 w-4" />
                Recurrentes
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gastos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo gasto
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard
        eyebrow="Tablero del mes"
        title="Saldo real disponible"
        description={`Lectura financiera de ${monthLabel}. El saldo real se mueve solo con cobros efectivamente marcados como pagados y con gastos registrados en este mismo mes.`}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="space-y-5 rounded-[28px] border border-rose-200/70 bg-gradient-to-br from-white via-rose-50/60 to-rose-100/70 p-6 shadow-[0_22px_60px_-40px_rgba(149,45,74,0.55)]">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Dinero realmente disponible
              </p>
              <p className={`text-4xl font-semibold tracking-tight ${realTone}`}>
                {formatCurrency(monthBoard.realAvailable)}
              </p>
              <p className="text-sm text-muted-foreground">
                Cobrado este mes {formatCurrency(monthOverview.metrics.collectedIncome)} menos gastos del mes{" "}
                {formatCurrency(monthOverview.metrics.periodExpenses)}.
              </p>
            </div>

            <div className="space-y-3 rounded-[24px] border border-border/70 bg-white/90 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Cobrado real</span>
                <span>{formatCurrency(monthOverview.metrics.collectedIncome)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-emerald-100/80">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${collectedWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Gastado este mes</span>
                <span>{formatCurrency(monthOverview.metrics.periodExpenses)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-rose-100/80">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all"
                  style={{ width: `${expenseWidth}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard
              label="Se va a cobrar"
              value={formatCurrency(monthOverview.metrics.expectedIncome)}
              subtitle={`Total comprometido con vencimiento dentro de ${monthLabel}.`}
              icon={Wallet}
              tone="sage"
            />
            <MetricCard
              label="Falta por cobrar"
              value={formatCurrency(monthBoard.pendingToCollect)}
              subtitle="Lo que todavia no entro, sin descontar gastos."
              icon={Receipt}
              tone="amber"
            />
            <MetricCard
              label="Porcentaje gastado"
              value={`${monthBoard.spentShareOfCollected.toFixed(0)}%`}
              subtitle="Cuanto de lo cobrado del mes ya fue consumido por gastos."
              icon={RefreshCcw}
              tone="danger"
            />
            <MetricCard
              label="Gastado este mes"
              value={formatCurrency(monthOverview.metrics.periodExpenses)}
              subtitle="Egresos reales registrados en este mes."
              icon={RefreshCcw}
              tone="rose"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Vista operativa"
        title="Historial de gastos"
        description="Busqueda por descripcion o categoria, con filtro por tipo."
      >
        <form className="grid gap-3 border-b border-border/80 pb-5 lg:grid-cols-[minmax(0,1.2fr)_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={filters.query}
              placeholder="Buscar por descripcion o categoria"
              className="pl-10"
            />
          </div>
          <select name="type" defaultValue={filters.type || ""} className={selectClassName}>
            <option value="">Todos los tipos</option>
            <option value="OPERATIVE">Operativo</option>
            <option value="TAX">Impuesto</option>
            <option value="SERVICE">Servicio</option>
            <option value="OTHER">Otro</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {filters.query || filters.type ? (
              <Button asChild variant="ghost">
                <Link href="/gastos">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {expenseList.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              icon={Receipt}
              title="No hay gastos para esta vista"
              description="Registra un gasto nuevo o limpia los filtros para volver a ver el historial completo."
              action={
                <Button asChild>
                  <Link href="/gastos/nuevo">
                    <Plus className="h-4 w-4" />
                    Crear gasto
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto pt-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35">
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Descripcion
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Monto
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {expenseList.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{item.description}</p>
                        {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{getExpenseTypeLabel(item.type)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.category ?? "Sin categoria"}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#9d4d4d]">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/gastos/${item.id}`}>Operar</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
