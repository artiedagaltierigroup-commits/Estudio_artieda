import { getClient } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import {
  getClientPortfolioStatusLabel,
  getClientPortfolioStatusTone,
  getReminderPriorityTone,
} from "@/lib/module-presenters";
import { getCaseStatusTone, getChargeStatusTone, getNameInitials } from "@/lib/presentation";
import {
  formatDate,
  formatDateTime,
  getCaseStatusLabel,
  getChargeStatusLabel,
} from "@/lib/utils";
import {
  AlarmClockCheck,
  ArrowLeft,
  BellRing,
  Briefcase,
  FileText,
  HandCoins,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Plus,
  Languages,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const contactItems = [
    { label: "Email", value: client.email, icon: Mail },
    { label: "Telefono", value: client.phone, icon: Phone },
    { label: "Direccion", value: client.address, icon: MapPin },
    { label: "Idiomas", value: client.languages, icon: Languages },
    { label: "Identificacion", value: client.taxId, icon: FileText },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ficha del cliente"
        title={client.name}
        description="Vista central del vinculo profesional: datos base, casos asociados, deuda viva, cobros registrados y recordatorios pendientes."
        stats={[
          { label: "Casos", value: `${client.caseSummary.total}` },
          { label: "Deuda", value: <MoneyAmount value={client.financeSummary.balance} /> },
          { label: "Cobrado", value: <MoneyAmount value={client.financeSummary.collected} /> },
          {
            label: "Ultimo movimiento",
            value: client.financeSummary.lastMovementAt
              ? formatDateTime(client.financeSummary.lastMovementAt)
              : "Sin movimientos",
          },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clientes">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clientes/${client.id}/editar`}>
                <PencilLine className="h-4 w-4" />
                Editar cliente
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/casos/nuevo?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                Nuevo caso
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Estado"
          value={getClientPortfolioStatusLabel(client.portfolioStatus)}
          subtitle={`${client.financeSummary.openReminders} recordatorio(s) abiertos`}
          icon={Wallet}
          tone={getClientPortfolioStatusTone(client.portfolioStatus)}
        />
        <MetricCard
          label="Deuda actual"
          value={<MoneyAmount value={client.financeSummary.balance} />}
          subtitle={`${client.financeSummary.overdue} cobro(s) vencido(s)`}
          icon={AlarmClockCheck}
          tone={client.financeSummary.overdue > 0 ? "danger" : "amber"}
        />
        <MetricCard
          label="Cobrado historico"
          value={<MoneyAmount value={client.financeSummary.collected} />}
          subtitle={`${client.paymentTimeline.length} pago(s) registrados`}
          icon={HandCoins}
          tone="sage"
        />
        <MetricCard
          label="Proximos vencimientos"
          value={`${client.upcomingCharges.length}`}
          subtitle="Cobros aun abiertos para seguimiento."
          icon={BellRing}
          tone="lilac"
        />
        <MetricCard
          label="Casos activos"
          value={`${client.caseSummary.active}`}
          subtitle={`${client.caseSummary.closed} cerrado(s), ${client.caseSummary.suspended} suspendido(s)`}
          icon={Briefcase}
          tone="rose"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard
          eyebrow="Contacto"
          title="Ficha base"
          description="Datos primarios del cliente para mantener la operacion ordenada."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.18))] p-5 sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/12 text-lg font-semibold text-[#8f4e68]">
                  {getNameInitials(client.name)}
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{client.name}</p>
                  <StatusChip
                    label={getClientPortfolioStatusLabel(client.portfolioStatus)}
                    tone={getClientPortfolioStatusTone(client.portfolioStatus)}
                  />
                </div>
              </div>
            </div>

            {contactItems.length > 0 ? (
              contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-[24px] border border-border/70 bg-white/80 p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">{item.label}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.value}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Aun no hay datos de contacto complementarios cargados para este cliente.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Notas"
          title="Observaciones internas"
          description="Contexto util para el seguimiento profesional diario."
        >
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
            <p className="text-sm leading-7 text-foreground">
              {client.notes ?? "Todavia no hay notas internas para este cliente."}
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {client.casesWithSummary.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Todavia no hay casos asociados"
            description="El siguiente paso natural es abrir el primer caso desde este cliente para conectar expediente, cobros y seguimiento."
            action={
              <Button asChild>
                <Link href={`/casos/nuevo?clientId=${client.id}`}>
                  <Plus className="h-4 w-4" />
                  Crear caso
                </Link>
              </Button>
            }
          />
        ) : (
          <SectionCard
            eyebrow="Relacion activa"
            title="Casos asociados"
            description="Cada expediente ya muestra lectura rapida de cobrado, deuda y estado."
            contentClassName="p-0"
          >
            <ul className="divide-y divide-border/80">
              {client.casesWithSummary.map((currentCase) => (
                <li key={currentCase.id}>
                  <Link
                    href={`/casos/${currentCase.id}`}
                    className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-muted/25"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold tracking-[-0.02em] text-foreground">
                            {currentCase.title}
                          </p>
                          <StatusChip
                            label={getCaseStatusLabel(currentCase.status)}
                            tone={getCaseStatusTone(currentCase.status)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                            Inicio: {formatDate(currentCase.startDate)}
                          </span>
                          <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                            Actualizado: {formatDateTime(currentCase.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-border/70 bg-white/80 px-4 py-3 text-sm">
                          <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Cobrado</p>
                          <p className="mt-1 font-semibold text-[#48745f]">
                            <MoneyAmount value={currentCase.chargeSummary.collected} />
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-border/70 bg-white/80 px-4 py-3 text-sm">
                          <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Saldo</p>
                          <p className="mt-1 font-semibold text-foreground">
                            <MoneyAmount value={currentCase.chargeSummary.balance} />
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-border/70 bg-white/80 px-4 py-3 text-sm">
                          <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Vencidos</p>
                          <p className="mt-1 font-semibold text-[#9d4d4d]">{currentCase.chargeSummary.overdue}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <SectionCard
          eyebrow="Seguimiento"
          title="Proximos vencimientos"
          description="Cobros todavia abiertos para accionar desde el cliente."
          contentClassName="p-0"
        >
          {client.upcomingCharges.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              No hay cobros pendientes o parciales asociados a este cliente.
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {client.upcomingCharges.slice(0, 6).map((charge) => (
                <li key={charge.id} className="space-y-2 px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{charge.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{charge.caseTitle}</p>
                    </div>
                    <StatusChip
                      label={getChargeStatusLabel(charge.derivedStatus)}
                      tone={getChargeStatusTone(charge.derivedStatus)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Vence: {formatDate(charge.dueDate)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Saldo: <MoneyAmount value={charge.balance} />
                    </span>
                    {charge.followUpDate ? (
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Seguimiento: {formatDate(charge.followUpDate)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Historial"
          title="Cobros registrados"
          description="Ultimos pagos vinculados al cliente para lectura rapida del historial financiero."
          contentClassName="p-0"
        >
          {client.paymentTimeline.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              Todavia no hay pagos registrados para este cliente.
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {client.paymentTimeline.slice(0, 10).map((payment) => (
                <li key={payment.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{payment.chargeDescription}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{payment.caseTitle}</p>
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
          title="Panel interno"
          description="Recordatorios vinculados al cliente para no perder seguimientos."
          contentClassName="p-0"
        >
          {client.reminders.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              Este cliente todavia no tiene recordatorios asociados.
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {client.reminders.map((reminder) => (
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
