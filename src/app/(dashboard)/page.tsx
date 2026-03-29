import { getAnalyticsSnapshot, getDashboardOverview } from "@/actions/dashboard";
import {
  getRecurringPayableChecklist,
  markRecurringOccurrencePaid,
  reopenRecurringOccurrence,
} from "@/actions/recurring-expense-occurrences";
import { RecurringPayablesChecklist } from "@/components/dashboard/recurring-payables-checklist";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getReminderPriorityTone } from "@/lib/module-presenters";
import { getChargeStatusTone } from "@/lib/presentation";
import { formatCurrency, formatDate, formatDateTime, getChargeStatusLabel } from "@/lib/utils";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlarmClockCheck,
  BellRing,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  async function handleMarkPaid(formData: FormData) {
    "use server";
    const occurrenceId = String(formData.get("occurrenceId") ?? "");
    if (occurrenceId) {
      await markRecurringOccurrencePaid(occurrenceId);
    }
    redirect("/");
  }

  async function handleReopen(formData: FormData) {
    "use server";
    const occurrenceId = String(formData.get("occurrenceId") ?? "");
    if (occurrenceId) {
      await reopenRecurringOccurrence(occurrenceId);
    }
    redirect("/");
  }

  const now = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to = format(endOfMonth(now), "yyyy-MM-dd");

  const [overview, analytics, recurringChecklist] = await Promise.all([
    getDashboardOverview({ from, to }),
    getAnalyticsSnapshot(12),
    getRecurringPayableChecklist(now),
  ]);

  const { metrics } = overview;
  const periodLabel = format(now, "MMMM yyyy", { locale: es });

  const cards = [
    {
      label: "Ingresos esperados",
      value: formatCurrency(metrics.expectedIncome),
      subtitle: "Cobros con vencimiento dentro del mes actual.",
      icon: Calendar,
      tone: "rose" as const,
    },
    {
      label: "Ingresos cobrados",
      value: formatCurrency(metrics.collectedIncome),
      subtitle: "Entradas reales registradas durante este periodo.",
      icon: TrendingUp,
      tone: "sage" as const,
    },
    {
      label: "Pendiente de cobro",
      value: formatCurrency(metrics.pendingIncome),
      subtitle: "Saldo vivo que sigue necesitando seguimiento.",
      icon: Clock,
      tone: "amber" as const,
    },
    {
      label: "Gastos del mes",
      value: formatCurrency(metrics.periodExpenses + metrics.projectedRecurring),
      subtitle: "Gastos reales mas proyeccion recurrente.",
      icon: TrendingDown,
      tone: "danger" as const,
    },
    {
      label: "Resultado neto",
      value: formatCurrency(metrics.netResult),
      subtitle: "Cobrado real menos gasto real y fijo proyectado.",
      icon: Wallet,
      tone: metrics.netResult >= 0 ? ("sage" as const) : ("danger" as const),
    },
    {
      label: "Casos activos",
      value: `${metrics.activeCases}`,
      subtitle: `${metrics.overdueCharges} cobro(s) vencido(s) en total.`,
      icon: Users,
      tone: "lilac" as const,
    },
    {
      label: "Recordatorios abiertos",
      value: `${metrics.openReminders}`,
      subtitle: "Seguimientos pendientes dentro de la app.",
      icon: BellRing,
      tone: "amber" as const,
    },
    {
      label: "Ganancia neta total",
      value: formatCurrency(metrics.netIncome),
      subtitle: "Todo lo cobrado menos egresos reales historicos.",
      icon: DollarSign,
      tone: metrics.netIncome >= 0 ? ("slate" as const) : ("danger" as const),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        stats={[
          { label: "Periodo", value: periodLabel },
          { label: "Mejor mes", value: metrics.topMonth?.month ?? "Sin datos" },
          { label: "Cliente destacado", value: metrics.topClient?.name ?? "Sin datos" },
          { label: "Proyeccion fija", value: formatCurrency(metrics.projectedRecurring) },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <SectionCard
        eyebrow="Recordatorios"
        title="Pendientes del dashboard"
        description="Alertas y tareas abiertas para que no queden escondidas dentro del panel."
        contentClassName="p-0"
      >
        {overview.urgentReminders.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">
            No hay recordatorios abiertos para este momento.
          </div>
        ) : (
          <div className="grid gap-0 lg:grid-cols-3">
            {overview.urgentReminders.map((reminder) => (
              <div key={reminder.id} className="space-y-3 border-b border-border/80 px-6 py-5 lg:border-b-0 lg:border-r last:border-r-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{reminder.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reminder.caseTitle ?? reminder.clientName ?? "General"}
                    </p>
                  </div>
                  <StatusChip label={reminder.priority} tone={getReminderPriorityTone(reminder.priority)} />
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(reminder.reminderDate)}</p>
                <Link href="/recordatorios" className="text-xs font-medium text-primary hover:underline">
                  Ver recordatorios
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <RecurringPayablesChecklist
        pending={recurringChecklist.pending}
        paid={recurringChecklist.paid}
        onMarkPaid={handleMarkPaid}
        onReopen={handleReopen}
      />

      <DashboardCharts monthlyNet={analytics.monthlyNet} />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          eyebrow="Proximos vencimientos"
          title="Cobros a seguir"
          description="Compromisos abiertos ordenados por vencimiento."
          contentClassName="p-0"
        >
          {overview.upcomingCharges.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">No hay cobros abiertos para seguir ahora mismo.</div>
          ) : (
            <ul className="divide-y divide-border/80">
              {overview.upcomingCharges.map((charge) => (
                <li key={charge.id} className="space-y-2 px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{charge.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {charge.clientName} · {charge.caseTitle}
                      </p>
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
                      Saldo: {formatCurrency(charge.balance)}
                    </span>
                  </div>
                  <div>
                    <Link href={`/cobros/${charge.id}`} className="text-xs font-medium text-primary hover:underline">
                      Abrir cobro
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Clientes con deuda"
          title="Foco comercial"
          description="Clientes con mayor saldo pendiente acumulado."
          contentClassName="p-0"
        >
          {overview.debtClients.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">Todavia no hay deuda pendiente acumulada.</div>
          ) : (
            <ul className="divide-y divide-border/80">
              {overview.debtClients.map((client) => (
                <li key={client.clientId} className="space-y-2 px-6 py-4">
                  <p className="font-medium text-foreground">{client.clientName}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Cobrado: {formatCurrency(client.collected)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Deuda: {formatCurrency(client.balance)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Recordatorios"
          title="Panel rapido"
          description="Acceso directo al modulo completo de seguimiento."
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
              <p className="text-sm font-semibold text-foreground">Abiertos ahora</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{metrics.openReminders}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Recordatorios pendientes entre clientes, casos y tareas generales.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full justify-center">
              <Link href="/recordatorios">Abrir recordatorios</Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Enfoque sugerido"
        title="Lo que conviene mirar a continuacion"
        description="Tres indicadores simples para orientar la accion inmediata."
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))]"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-[#8f4e68]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Pendiente vivo</p>
                <p className="text-xs text-muted-foreground">Cobros que todavia requieren accion.</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {formatCurrency(metrics.pendingIncome)}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <p className="text-sm font-semibold text-foreground">Resultado del mes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Diferencia entre lo cobrado y lo que ya se fue en gastos.
            </p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {formatCurrency(metrics.netResult)}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-white/85 p-5">
            <p className="text-sm font-semibold text-foreground">Cliente con mas traccion</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Referencia rapida para entender donde se concentra la facturacion.
            </p>
            <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
              {metrics.topClient?.name ?? "Sin datos suficientes"}
            </p>
            {metrics.topClient ? (
              <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(metrics.topClient.total)} acumulados.</p>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
