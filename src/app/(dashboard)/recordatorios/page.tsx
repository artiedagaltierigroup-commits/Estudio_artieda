import {
  completeReminder,
  createReminder,
  deleteReminder,
  getReminderReferences,
  getReminders,
  reopenReminder,
} from "@/actions/reminders";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import {
  getRecurringPayableAlerts,
  markRecurringOccurrencePaid,
} from "@/actions/recurring-expense-occurrences";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { SubmitButton } from "@/components/system/submit-button";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { Button } from "@/components/ui/button";
import { getReminderPriorityTone } from "@/lib/module-presenters";
import { sortRemindersForPanel, summarizeReminderPanel } from "@/lib/operations-insights";
import { formatDate, formatDateTime, getPriorityLabel } from "@/lib/utils";
import { Bell, CalendarCheck2, CheckCircle2, Clock3, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  await createReminder(formData);
  redirect("/recordatorios");
}

async function handleComplete(formData: FormData) {
  "use server";
  const reminderId = String(formData.get("reminderId") ?? "");
  if (reminderId) {
    await completeReminder(reminderId);
  }
  redirect("/recordatorios");
}

async function handleReopen(formData: FormData) {
  "use server";
  const reminderId = String(formData.get("reminderId") ?? "");
  if (reminderId) {
    await reopenReminder(reminderId);
  }
  redirect("/recordatorios");
}

async function handleDelete(formData: FormData) {
  "use server";
  const reminderId = String(formData.get("reminderId") ?? "");
  if (reminderId) {
    await deleteReminder(reminderId);
  }
  redirect("/recordatorios");
}

async function handlePayRecurring(formData: FormData) {
  "use server";
  const occurrenceId = String(formData.get("occurrenceId") ?? "");
  if (occurrenceId) {
    await markRecurringOccurrencePaid(occurrenceId);
  }
  redirect("/recordatorios");
}

export default async function RecordatoriosPage() {
  const access = await getWorkspaceAccess();
  const [list, references, recurringAlerts] = await Promise.all([
    getReminders(),
    getReminderReferences(),
    access.role === "ADMIN" ? getRecurringPayableAlerts(new Date()) : Promise.resolve([]),
  ]);
  const summary = summarizeReminderPanel(list);
  const pending = sortRemindersForPanel(list.filter((item) => !item.completed));
  const done = [...list.filter((item) => item.completed)].sort(
    (left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguimiento"
        title="Tareas"
        description="Panel de tareas pendientes ligadas a clientes, casos o trabajo general."
        stats={[
          { label: "Pendientes", value: `${summary.pending}` },
          { label: "Vencidos", value: `${summary.overdue}` },
          { label: "Hoy", value: `${summary.dueToday}` },
          { label: "Resueltos", value: `${summary.completed}` },
        ]}
        actions={
          <CreateReminderDialog
            action={handleCreate}
            role={access.role}
            displayName={access.displayName}
            actorUserId={access.actorUserId}
            references={references}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Alta prioridad"
          value={`${summary.highPriority}`}
          subtitle="Alertas que conviene resolver antes de cerrar el dia."
          icon={Bell}
          tone="danger"
        />
        <MetricCard
          label="Pendientes"
          value={`${summary.pending}`}
          subtitle="Recordatorios aun abiertos dentro del panel."
          icon={Clock3}
          tone="amber"
        />
        <MetricCard
          label="Vencidos"
          value={`${summary.overdue}`}
          subtitle="Alertas cuya fecha ya quedo atras."
          icon={CalendarCheck2}
          tone="danger"
        />
        <MetricCard
          label="Proximos 7 dias"
          value={`${summary.upcoming}`}
          subtitle="Carga que ya esta entrando en la semana."
          icon={CheckCircle2}
          tone="sage"
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No hay tareas pendientes"
          description="Cuando registres alertas internas, esta vista te va a mostrar prioridad, fecha y contexto relacionado."
        />
      ) : (
        <SectionCard
          eyebrow="Pendientes"
          title="Alertas activas"
          description="Ordenadas para que lo mas sensible quede arriba."
          contentClassName="space-y-3"
        >
          {pending.map((item) => {
            const relatedLabel =
              item.case?.client?.name && item.case?.title
                ? `${item.case.client.name} - ${item.case.title}`
                : item.client?.name ?? "General";

            return (
              <div
                key={item.id}
                className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{item.title}</p>
                      <StatusChip label={getPriorityLabel(item.priority)} tone={getReminderPriorityTone(item.priority)} />
                    </div>
                    {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        {formatDateTime(item.reminderDate)}
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">{relatedLabel}</span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">Asignada a: {item.assigneeName}</span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">Creada por: {item.creatorName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      {item.clientId ? (
                        <Link className="text-[#9a4e69] underline-offset-4 hover:underline" href={`/clientes/${item.clientId}`}>
                          Ver cliente
                        </Link>
                      ) : null}
                      {item.caseId ? (
                        <Link className="text-[#9a4e69] underline-offset-4 hover:underline" href={`/casos/${item.caseId}`}>
                          Ver caso
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link href={`/recordatorios/${item.id}/editar`}><PencilLine className="h-4 w-4" />Editar</Link></Button>
                    <form action={handleComplete}>
                      <input type="hidden" name="reminderId" value={item.id} />
                      <SubmitButton variant="secondary" pendingLabel="Resolviendo...">
                        <CheckCircle2 className="h-4 w-4" />
                        Resolver
                      </SubmitButton>
                    </form>
                    {access.role === "ADMIN" ? <form action={handleDelete}>
                      <input type="hidden" name="reminderId" value={item.id} />
                      <SubmitButton variant="ghost" className="text-[#9a4e69]" pendingLabel="Eliminando...">
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </SubmitButton>
                    </form> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </SectionCard>
      )}

      {done.length > 0 ? (
        <SectionCard
          eyebrow="Resueltos"
          title="Tareas completadas"
          description="Historial reciente de tareas ya cerradas, con opcion de reabrir si hizo falta."
          contentClassName="space-y-3"
        >
          {done.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-white/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#48745f]" />
                <div>
                  <p className="text-sm font-medium text-foreground line-through">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.reminderDate)}</p>
                  <p className="text-xs text-muted-foreground">Asignada a: {item.assigneeName} · Creada por: {item.creatorName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href={`/recordatorios/${item.id}/editar`}>Editar</Link></Button>
              <form action={handleReopen}>
                <input type="hidden" name="reminderId" value={item.id} />
                <SubmitButton variant="ghost" pendingLabel="Reabriendo...">
                  <RotateCcw className="h-4 w-4" />
                  Reabrir
                </SubmitButton>
              </form>
              </div>
            </div>
          ))}
        </SectionCard>
      ) : null}

      {recurringAlerts.length > 0 ? (
        <SectionCard
          eyebrow="Gastos por pagar"
          title="Alertas de recurrentes"
          description="Obligaciones recurrentes visibles con el mismo criterio operativo del modulo."
          contentClassName="space-y-3"
        >
          {recurringAlerts.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                    <StatusChip label={getPriorityLabel(item.priority)} tone={getReminderPriorityTone(item.priority)} />
                    <StatusChip label={item.status === "OVERDUE" ? "Vencido" : "Pendiente"} tone={item.status === "OVERDUE" ? "danger" : "amber"} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Vence {formatDate(item.reminderDate.toISOString().slice(0, 10))}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      <MoneyAmount value={item.amount} />
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={handlePayRecurring}>
                    <input type="hidden" name="occurrenceId" value={item.id} />
                    <SubmitButton variant="secondary" pendingLabel="Marcando...">
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar pagado
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </SectionCard>
      ) : null}
    </div>
  );
}
