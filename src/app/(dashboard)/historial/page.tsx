import { getActivityLog } from "@/actions/activity-log";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { getActivityActionLabel, getActivityEntityLabel } from "@/lib/module-presenters";
import { formatDateTime } from "@/lib/utils";
import { History, PencilLine, Trash2 } from "lucide-react";

export default async function HistorialPage() {
  const logs = await getActivityLog();
  const createdCount = logs.filter((item) => item.action === "created").length;
  const updatedCount = logs.filter((item) => item.action === "updated").length;
  const deletedCount = logs.filter((item) => item.action === "deleted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Auditoria base"
        title="Historial"
        description="Registro tecnico de cambios relevantes sobre casos, cobros, pagos, gastos y recordatorios."
        stats={[
          { label: "Registros", value: `${logs.length}` },
          { label: "Creaciones", value: `${createdCount}` },
          { label: "Ediciones", value: `${updatedCount}` },
          { label: "Eliminaciones", value: `${deletedCount}` },
        ]}
      />

      {logs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Creado"
            value={`${createdCount}`}
            subtitle="Altas registradas dentro del historial."
            icon={History}
            tone="sage"
          />
          <MetricCard
            label="Actualizado"
            value={`${updatedCount}`}
            subtitle="Cambios sobre entidades ya existentes."
            icon={PencilLine}
            tone="amber"
          />
          <MetricCard
            label="Eliminado"
            value={`${deletedCount}`}
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
        <SectionCard
          eyebrow="Linea de tiempo"
          title="Cambios recientes"
          description="Los ultimos movimientos con su entidad, accion y detalle tecnico."
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
                {log.note ? <p className="text-sm text-foreground">{String(log.note)}</p> : null}
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
      )}
    </div>
  );
}
