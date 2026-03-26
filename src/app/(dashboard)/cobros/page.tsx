import { getCharges } from "@/actions/charges";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChargeStatusTone } from "@/lib/presentation";
import { formatCurrency, formatDate, getChargeStatusLabel } from "@/lib/utils";
import {
  AlarmClockCheck,
  Clock3,
  Coins,
  CreditCard,
  HandCoins,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface CobrosPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function CobrosPage({ searchParams }: CobrosPageProps) {
  const params = (await searchParams) ?? {};
  const filters = {
    query: params.q?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };

  const charges = await getCharges(filters);
  const totals = charges.reduce(
    (acc, charge) => {
      if (charge.derivedStatus === "CANCELLED") {
        acc.CANCELLED += 1;
        return acc;
      }

      acc.total += Number(charge.amountTotal);
      acc.paid += Number(charge.amountPaid);
      acc.balance += charge.balance;
      acc[charge.derivedStatus] += 1;
      return acc;
    },
    {
      total: 0,
      paid: 0,
      balance: 0,
      PENDING: 0,
      PARTIAL: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control financiero"
        title="Cobros"
        description="Bandeja de compromisos de cobro con lectura de saldo, vencimiento, pagos aplicados y acceso directo a operar cada uno."
        stats={[
          { label: "Visibles", value: `${charges.length}` },
          { label: "Saldo vivo", value: formatCurrency(totals.balance) },
          { label: "Parciales", value: `${totals.PARTIAL}` },
          { label: "Vencidos", value: `${totals.OVERDUE}` },
        ]}
        actions={
          <Button asChild>
            <Link href="/cobros/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo cobro
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cobrado"
          value={formatCurrency(totals.paid)}
          subtitle="Pagos ya registrados sobre el total pactado."
          icon={HandCoins}
          tone="sage"
        />
        <MetricCard
          label="Programados"
          value={formatCurrency(totals.total)}
          subtitle="Monto comprometido entre todos los cobros visibles."
          icon={Coins}
          tone="lilac"
        />
        <MetricCard
          label="Vencidos"
          value={`${totals.OVERDUE} cobro(s)`}
          subtitle="Compromisos que ya requieren seguimiento inmediato."
          icon={AlarmClockCheck}
          tone="danger"
        />
        <MetricCard
          label="Pendiente"
          value={formatCurrency(totals.balance)}
          subtitle="Saldo que todavia falta recuperar."
          icon={Clock3}
          tone="amber"
        />
      </div>

      <SectionCard
        eyebrow="Vista operativa"
        title="Compromisos de cobro"
        description="Busqueda por cliente, caso o descripcion, con filtro por estado derivado."
      >
        <form className="grid gap-3 border-b border-border/80 pb-5 lg:grid-cols-[minmax(0,1.2fr)_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={filters.query}
              placeholder="Buscar por descripcion, cliente o caso"
              className="pl-10"
            />
          </div>

          <select name="status" defaultValue={filters.status || ""} className={selectClassName}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="PARTIAL">Parciales</option>
            <option value="OVERDUE">Vencidos</option>
            <option value="PAID">Pagados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>

          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {filters.query || filters.status ? (
              <Button asChild variant="ghost">
                <Link href="/cobros">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {charges.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              icon={CreditCard}
              title="No hay cobros para esta vista"
              description="Crea un cobro nuevo o limpia los filtros para volver a ver el panel completo."
              action={
                <Button asChild>
                  <Link href="/cobros/nuevo">
                    <Plus className="h-4 w-4" />
                    Crear cobro
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
                    Cobro
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cliente / Caso
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cobrado
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Saldo
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Vencimiento
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {charges.map((charge) => (
                  <tr key={charge.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{charge.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {charge.payments.length} pago(s) · {charge.followUpDate ? `seguimiento ${formatDate(charge.followUpDate)}` : "sin seguimiento"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{charge.case?.client?.name ?? "Sin cliente"}</p>
                      <p className="mt-1">{charge.case?.title ?? "Sin caso asociado"}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {formatCurrency(charge.amountTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-[#48745f]">
                      {formatCurrency(charge.amountPaid)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      {formatCurrency(charge.balance)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(charge.dueDate)}</td>
                    <td className="px-6 py-4">
                      <StatusChip
                        label={getChargeStatusLabel(charge.derivedStatus)}
                        tone={getChargeStatusTone(charge.derivedStatus)}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/cobros/${charge.id}`}>Operar</Link>
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
