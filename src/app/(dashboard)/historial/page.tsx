import { getActivityLog } from "@/actions/activity-log";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { getActivityActionLabel, getActivityEntityLabel } from "@/lib/module-presenters";
import { describeActivityLogEntry, summarizeActivityMetrics } from "@/lib/operations-insights";
import { formatDateTime } from "@/lib/utils";
import { History, PencilLine, ReceiptText, Scale, Trash2 } from "lucide-react";

export default async function HistorialPage() {
  const logs = await getActivityLog();
  const summary = summarizeActivityMetrics(logs);
  const busiestEntity = Object.entries(summary.entities).sort((left, right) => right[1] - left[1])[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Movimientos"
        title="Historial"
        description="Registro de cambios para entender que paso, cuando paso y sobre que parte del estudio."
        stats={[
          { label: "Registros", value: `${logs.length}` },
          { label: "Creaciones", value: `${summary.actions.created}` },
          { label: "Ediciones", value: `${summary.actions.updated + summary.actions.status_changed + summary.actions.due_date_changed}` },
          { label: "Entidad mas activa", value: busiestEntity ? getActivityEntityLabel(busiestEntity[0]) : "-" },
        ]}
      />

      {logs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Creado"
            value={`${summary.actions.created}`}
            subtitle="Altas registradas dentro del historial."
            icon={History}
            tone="sage"
          />
          <MetricCard
            label="Actualizado"
            value={`${summary.actions.updated}`}
            subtitle="Cambios sobre entidades ya existentes."
            icon={PencilLine}
            tone="amber"
          />
          <MetricCard
            label="Estado / vencimiento"
            value={`${summary.actions.status_changed + summary.actions.due_date_changed}`}
            subtitle="Eventos operativos ligados a seguimiento."
            icon={Scale}
            tone="rose"
          />
          <MetricCard
            label="Eliminado"
            value={`${summary.actions.deleted}`}
            subtitle="Bajas o anulaciones registradas."
            icon={Trash2}
            tone="danger"
          />
        </div>
      ) : null}

      {logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="Todavia no hay cambios registrados"
          description="A medida que uses casos, cobros, pagos, gastos y recordatorios, esta vista va a mostrar el rastro tecnico de cada accion."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
          <SectionCard
            eyebrow="Linea de tiempo"
            title="Cambios recientes"
            description="Cada entrada intenta describir el cambio de forma legible antes de mostrar el JSON tecnico."
            contentClassName="space-y-4"
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.12))] p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip label={getActivityEntityLabel(log.entityType)} tone="slate" />
                    <StatusChip label={getActivityActionLabel(log.action)} tone="rose" />
                  </div>
                  <p className="text-sm leading-6 text-foreground">{describeActivityLogEntry(log)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                </div>

                {(log.previousValue !== null || log.newValue !== null) && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[20px] border border-border/70 bg-white/85 p-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Valor anterior
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-muted-foreground">
                        {JSON.stringify(log.previousValue, null, 2) || "Sin dato"}
                      </pre>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-white/85 p-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Valor nuevo
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-muted-foreground">
                        {JSON.stringify(log.newValue, null, 2) || "Sin dato"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </SectionCard>

          <SectionCard
            eyebrow="Lectura rapida"
            title="Entidades con mas movimiento"
            description="Sirve para detectar donde esta el mayor volumen de cambios."
            contentClassName="space-y-3"
          >
            {Object.entries(summary.entities)
              .sort((left, right) => right[1] - left[1])
              .map(([entity, count]) => (
                <div
                  key={entity}
                  className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-4 shadow-[0_18px_50px_-40px_rgba(135,92,111,0.42)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-[#9a4e69]" />
                      <p className="text-sm font-medium text-foreground">{getActivityEntityLabel(entity)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#9a4e69]">{count}</p>
                  </div>
                </div>
              ))}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
