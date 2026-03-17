import { getCase } from "@/actions/cases";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { summarizeCaseCharges } from "@/lib/detail-summaries";
import { getCaseStatusTone, getChargeStatusTone } from "@/lib/presentation";
import {
  deriveChargeStatus,
  formatCurrency,
  formatDate,
  getCaseStatusLabel,
  getChargeStatusLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  HandCoins,
  Plus,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseData = await getCase(id);
  if (!caseData) notFound();

  const chargeSummary = summarizeCaseCharges(caseData.charges);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Expediente"
        title={caseData.title}
        description={`Cliente asociado: ${caseData.client?.name ?? "Sin cliente"}. Esta ficha ya queda lista para evolucionar con historial, pagos parciales y seguimiento operativo.`}
        stats={[
          { label: "Cobros", value: `${chargeSummary.total}` },
          { label: "Pactado", value: formatCurrency(chargeSummary.expected) },
          { label: "Cobrado", value: formatCurrency(chargeSummary.collected) },
          { label: "Saldo", value: formatCurrency(chargeSummary.balance) },
        ]}
        actions={
          <>
            <StatusChip
              label={getCaseStatusLabel(caseData.status)}
              tone={getCaseStatusTone(caseData.status)}
            />
            <Button asChild variant="outline">
              <Link href="/casos">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/cobros/nuevo?caseId=${caseData.id}`}>
                <Plus className="h-4 w-4" />
                Nuevo cobro
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Honorarios"
          value={caseData.fee ? formatCurrency(caseData.fee) : "Sin definir"}
          subtitle="Monto base pactado para este expediente."
          icon={WalletCards}
          tone="rose"
        />
        <MetricCard
          label="Cobrado"
          value={formatCurrency(chargeSummary.collected)}
          subtitle="Pagos efectivamente registrados."
          icon={HandCoins}
          tone="sage"
        />
        <MetricCard
          label="Saldo"
          value={formatCurrency(chargeSummary.balance)}
          subtitle="Monto que todavia sigue vivo dentro del caso."
          icon={CreditCard}
          tone={chargeSummary.balance > 0 ? "amber" : "slate"}
        />
        <MetricCard
          label="Vencidos"
          value={`${chargeSummary.overdue} cobro(s)`}
          subtitle="Compromisos del caso que ya pasaron la fecha."
          icon={CalendarClock}
          tone={chargeSummary.overdue > 0 ? "danger" : "slate"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Resumen"
          title="Datos del caso"
          description="Informacion base del expediente para lectura rapida."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Cliente
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {caseData.client?.name ?? "Sin cliente"}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Estado
              </p>
              <div className="mt-2">
                <StatusChip
                  label={getCaseStatusLabel(caseData.status)}
                  tone={getCaseStatusTone(caseData.status)}
                />
              </div>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Inicio
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(caseData.startDate)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Cierre
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(caseData.endDate)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Contexto"
          title="Descripcion"
          description="Texto base del expediente para orientacion rapida."
        >
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
            <p className="text-sm leading-7 text-foreground">
              {caseData.description ?? "Todavia no hay una descripcion cargada para este caso."}
            </p>
          </div>
        </SectionCard>
      </div>

      {caseData.charges.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Todavia no hay cobros registrados"
          description="Este expediente ya esta listo para empezar a cargar cobros pactados y despues pagos parciales."
          action={
            <Button asChild>
              <Link href={`/cobros/nuevo?caseId=${caseData.id}`}>
                <Plus className="h-4 w-4" />
                Crear cobro
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          eyebrow="Seguimiento financiero"
          title="Cobros del caso"
          description="Cada cobro muestra total, pagos aplicados, saldo y vencimiento derivado."
        >
          <div className="space-y-4">
            {caseData.charges.map((charge) => {
              const amountPaid = charge.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
              const balance = parseFloat(charge.amountTotal) - amountPaid;
              const status = deriveChargeStatus(charge.amountTotal, amountPaid.toFixed(2), charge.dueDate);

              return (
                <div
                  key={charge.id}
                  className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold tracking-[-0.02em] text-foreground">
                          {charge.description}
                        </p>
                        <StatusChip
                          label={getChargeStatusLabel(status)}
                          tone={getChargeStatusTone(status)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Total: {formatCurrency(charge.amountTotal)}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Cobrado: {formatCurrency(amountPaid)}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Saldo: {formatCurrency(balance)}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Vence: {formatDate(charge.dueDate)}
                        </span>
                      </div>

                      {charge.notes ? (
                        <p className="text-sm leading-6 text-muted-foreground">{charge.notes}</p>
                      ) : null}
                    </div>
                  </div>

                  {charge.payments.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                      {charge.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-[20px] border border-border/70 bg-white/85 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.method ?? "Pago registrado"}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#48745f]">
                              {formatCurrency(payment.amount)}
                            </p>
                            {payment.notes ? (
                              <p className="text-xs text-muted-foreground">{payment.notes}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
