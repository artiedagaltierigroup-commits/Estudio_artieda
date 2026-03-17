import { getCharges } from "@/actions/charges";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getChargeStatusTone } from "@/lib/presentation";
import { formatCurrency, formatDate, getChargeStatusLabel } from "@/lib/utils";
import {
  AlarmClockCheck,
  Clock3,
  Coins,
  CreditCard,
  HandCoins,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default async function CobrosPage() {
  const charges = await getCharges();
  const totals = charges.reduce(
    (acc, charge) => {
      const total = Number(charge.amountTotal);
      const paid = Number(charge.amountPaid);
      const balance = total - paid;

      acc.total += total;
      acc.paid += paid;
      acc.balance += balance;
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
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control financiero"
        title="Cobros"
        description="Seccion central para leer pactado, cobrado y saldo vivo de cada compromiso sin depender aun de filtros avanzados."
        stats={[
          { label: "Registros", value: `${charges.length}` },
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

      {charges.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Cobrado"
            value={formatCurrency(totals.paid)}
            subtitle="Pagos ya registrados sobre el total pactado."
            icon={HandCoins}
            tone="sage"
          />
          <MetricCard
            label="Pendiente"
            value={formatCurrency(totals.balance)}
            subtitle="Saldo que todavia falta recuperar."
            icon={Clock3}
            tone="amber"
          />
          <MetricCard
            label="Vencidos"
            value={`${totals.OVERDUE} cobro(s)`}
            subtitle="Compromisos que ya requieren seguimiento inmediato."
            icon={AlarmClockCheck}
            tone="danger"
          />
          <MetricCard
            label="Programados"
            value={formatCurrency(totals.total)}
            subtitle="Monto comprometido entre todos los cobros cargados."
            icon={Coins}
            tone="lilac"
          />
        </div>
      ) : null}

      {charges.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Todavia no hay cobros cargados"
          description="Cuando registres el primer compromiso de cobro, esta pantalla va a mostrar saldo, estados y seguimiento financiero."
          action={
            <Button asChild>
              <Link href="/cobros/nuevo">
                <Plus className="h-4 w-4" />
                Crear primer cobro
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          eyebrow="Listado base"
          title="Compromisos de cobro"
          description="El estado sigue derivandose desde saldo y vencimiento. Esta vista solo lo hace visible de forma mas clara."
          contentClassName="p-0"
        >
          <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {charges.map((charge) => {
                  const balance = Number(charge.amountTotal) - Number(charge.amountPaid);

                  return (
                    <tr key={charge.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{charge.description}</p>
                          <p className="text-xs text-muted-foreground">
                            ID interno listo para detalle y edicion.
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
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(charge.dueDate)}</td>
                      <td className="px-6 py-4">
                        <StatusChip
                          label={getChargeStatusLabel(charge.derivedStatus)}
                          tone={getChargeStatusTone(charge.derivedStatus)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
