import { createReminder, getReminders } from "@/actions/reminders";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getReminderPriorityTone } from "@/lib/module-presenters";
import { formatDateTime, getPriorityLabel } from "@/lib/utils";
import { Bell, CheckCircle2, Plus } from "lucide-react";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  await createReminder(formData);
  redirect("/recordatorios");
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function RecordatoriosPage() {
  const list = await getReminders();
  const pending = list.filter((item) => !item.completed);
  const done = list.filter((item) => item.completed);
  const highPriority = pending.filter((item) => item.priority === "HIGH").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguimiento"
        title="Recordatorios"
        description="Panel interno de tareas y alertas. La idea aca es que nada importante se pierda entre casos, clientes y vencimientos."
        stats={[
          { label: "Pendientes", value: `${pending.length}` },
          { label: "Resueltos", value: `${done.length}` },
          { label: "Alta prioridad", value: `${highPriority}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <SectionCard
          eyebrow="Alta rapida"
          title="Nuevo recordatorio"
          description="Carga minima para registrar una alerta interna y seguir con la operacion."
        >
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" name="title" required placeholder="Ejemplo: escribirle a cliente o revisar vencimiento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderDate">Fecha y hora</Label>
                <Input id="reminderDate" name="reminderDate" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <select id="priority" name="priority" className={selectClassName}>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea id="description" name="description" className="min-h-[110px]" placeholder="Contexto breve para recordar por que hay que hacer esta accion." />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Guardar recordatorio
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Criterio"
          title="Como usarlo"
          description="En esta fase el modulo es interno, simple y practico."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Prioridad alta para deuda vencida o tareas que no pueden esperar.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Despues vamos a sumar automatismos por caso, cliente y calendario.
            </div>
          </div>
        </SectionCard>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No hay recordatorios pendientes"
          description="Cuando registres alertas internas, esta vista te va a mostrar prioridad, fecha y contexto relacionado."
        />
      ) : (
        <SectionCard
          eyebrow="Pendientes"
          title="Alertas activas"
          description="Ordenadas para una lectura rapida del trabajo pendiente."
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
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{item.title}</p>
                      <StatusChip
                        label={getPriorityLabel(item.priority)}
                        tone={getReminderPriorityTone(item.priority)}
                      />
                    </div>
                    {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        {formatDateTime(item.reminderDate)}
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        {relatedLabel}
                      </span>
                    </div>
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
          title="Recordatorios completados"
          description="Historial reciente de tareas ya cerradas."
          contentClassName="space-y-3"
        >
          {done.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-white/80 px-5 py-4"
            >
              <CheckCircle2 className="h-5 w-5 text-[#48745f]" />
              <div>
                <p className="text-sm font-medium text-foreground line-through">{item.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(item.reminderDate)}</p>
              </div>
            </div>
          ))}
        </SectionCard>
      ) : null}
    </div>
  );
}
