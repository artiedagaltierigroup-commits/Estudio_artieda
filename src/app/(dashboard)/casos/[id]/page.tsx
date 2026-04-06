import { getCase } from "@/actions/cases";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getCasePendingBalance } from "@/lib/case-insights";
import { getReminderPriorityTone } from "@/lib/module-presenters";
import { getCaseStatusTone, getChargeStatusTone } from "@/lib/presentation";
import {
  formatDate,
  formatDateTime,
  getCaseStatusLabel,
  getChargeStatusLabel,
  getPriorityLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  CreditCard,
  PencilLine,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function getPriorityTone(priority: string) {
  switch (priority) {
    case "HIGH":
      return "danger" as const;
    case "MEDIUM":
      return "amber" as const;
    case "LOW":
    default:
      return "slate" as const;
  }
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseData = await getCase(id);
  if (!caseData) notFound();

  const pendingBalance = getCasePendingBalance(
    caseData.fee,
    caseData.financeSummary.collected,
    caseData.financeSummary.balance
  );

  const nextDueDate =
    caseData.chargesWithDerivedStatus.find(
      (charge) => charge.derivedStatus === "OVERDUE" || charge.derivedStatus === "PARTIAL" || charge.derivedStatus === "PENDING"
    )?.dueDate ?? caseData.financeSummary.nextDueDate;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Expediente"
        title={caseData.title}
        description={`Cliente asociado: ${caseData.client?.name ?? "Sin cliente"}. Esta ficha ya centraliza contexto, cobros, pagos y recordatorios vinculados.`}
        stats={[
          { label: "Honorarios", value: caseData.fee ? <MoneyAmount value={caseData.fee} /> : "Sin definir" },
          { label: "Cobrado", value: <MoneyAmount value={caseData.financeSummary.collected} /> },
          { label: "Saldo pendiente", value: <MoneyAmount value={pendingBalance} /> },
          {
            label: caseData.financeSummary.overdue > 0 ? "Vencidos" : "Proximo vencimiento",
            value:
              caseData.financeSummary.overdue > 0
                ? `${caseData.financeSummary.overdue}`
                : formatDate(nextDueDate),
          },
        ]}
        actions={
          <>
            <StatusChip label={getCaseStatusLabel(caseData.status)} tone={getCaseStatusTone(caseData.status)} />
            <Button asChild variant="outline">
              <Link href="/casos">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/casos/${caseData.id}/editar`}>
                <PencilLine className="h-4 w-4" />
                Editar caso
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard
          eyebrow="Resumen"
          title="Datos del caso"
          description="Informacion base del expediente para lectura rapida."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cliente</p>
              <p className="mt-2 text-sm font-medium text-foreground">{caseData.client?.name ?? "Sin cliente"}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prioridad</p>
              <div className="mt-2">
                <StatusChip
                  label={getPriorityLabel(caseData.priority)}
                  tone={getPriorityTone(caseData.priority)}
                />
              </div>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Inicio</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(caseData.startDate)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cierre</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(caseData.endDate)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Cobros abiertos
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{caseData.financeSummary.openCharges}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Recordatorios abiertos
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {caseData.reminders.filter((reminder) => !reminder.completed).length}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5 sm:col-span-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Metodo de cobro preferido
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {caseData.preferredPaymentMethod ?? "Todavia no definido"}
              </p>
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

      {caseData.chargesWithDerivedStatus.length === 0 ? (
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
          description="Cada cobro muestra total, pagos aplicados, saldo, vencimiento y seguimiento."
        >
          <div className="space-y-4">
            {caseData.chargesWithDerivedStatus.map((charge) => (
              <div
                key={charge.id}
                className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{charge.description}</p>
                      <StatusChip
                        label={getChargeStatusLabel(charge.derivedStatus)}
                        tone={getChargeStatusTone(charge.derivedStatus)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Total: <MoneyAmount value={charge.amountTotal} />
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Cobrado: <MoneyAmount value={charge.amountPaid} />
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Saldo: <MoneyAmount value={charge.balance} />
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Vence: {formatDate(charge.dueDate)}
                      </span>
                      {charge.followUpDate ? (
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Seguimiento: {formatDate(charge.followUpDate)}
                        </span>
                      ) : null}
                    </div>

                    {charge.notes ? <p className="text-sm leading-6 text-muted-foreground">{charge.notes}</p> : null}
                    {charge.cancellationReason ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Motivo de cancelacion: {charge.cancellationReason}
                      </p>
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
                          <p className="text-sm font-medium text-foreground">{payment.method ?? "Pago registrado"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#48745f]">
                            <MoneyAmount value={payment.amount} />
                          </p>
                          {payment.notes ? <p className="text-xs text-muted-foreground">{payment.notes}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Historial"
          title="Pagos registrados"
          description="Timeline rapido de todos los pagos asociados al expediente."
          contentClassName="p-0"
        >
          {caseData.paymentTimeline.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              Todavia no hay pagos registrados para este caso.
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {caseData.paymentTimeline.map((payment) => (
                <li key={payment.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{payment.chargeDescription}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Fecha: {formatDate(payment.paymentDate)}
                      </span>
                      {payment.method ? (
                        <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                          Metodo: {payment.method}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#48745f]">
                      <MoneyAmount value={payment.amount} />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Recordatorios"
          title="Seguimiento interno"
          description="Alertas y tareas vinculadas al expediente."
          contentClassName="p-0"
        >
          {caseData.reminders.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              Este caso todavia no tiene recordatorios asociados.
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {caseData.reminders.map((reminder) => (
                <li key={reminder.id} className="space-y-2 px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{reminder.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {reminder.description ?? "Sin descripcion adicional."}
                      </p>
                    </div>
                    <StatusChip
                      label={reminder.completed ? "Resuelto" : "Pendiente"}
                      tone={reminder.completed ? "sage" : getReminderPriorityTone(reminder.priority)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Fecha: {formatDateTime(reminder.reminderDate)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Prioridad: {reminder.priority}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
