import { MoneyAmount } from "@/components/system/money-amount";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import type { AutomaticRecurringOverviewItem } from "@/lib/automatic-recurring-overview";
import { formatDate, getExpenseTypeLabel, getFrequencyLabel } from "@/lib/utils";

interface AutomaticRecurringOverviewProps {
  items: AutomaticRecurringOverviewItem[];
}

function getNextImpactLabel(daysUntilNextDue: number | null) {
  if (daysUntilNextDue === null) return "Sin proxima fecha";
  if (daysUntilNextDue < 0) return "Fecha pasada";
  if (daysUntilNextDue === 0) return "Impacta hoy";
  if (daysUntilNextDue === 1) return "Impacta manana";
  return `Impacta en ${daysUntilNextDue} dias`;
}

export function AutomaticRecurringOverview({ items }: AutomaticRecurringOverviewProps) {
  return (
    <SectionCard
      eyebrow="Gastos programados"
      title="Recurrentes automaticos"
      description="Estos gastos se convierten solos en gasto real cuando llega su fecha. Aca ves cual pega ahora y cual viene despues."
    >
      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
          No hay gastos programados activos para mostrar en esta vista.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-border/70 bg-white/90 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.description}</p>
                    <StatusChip
                      label={item.dueThisMonth ? "Impacta este mes" : "Proximo ciclo"}
                      tone={item.dueThisMonth ? "sage" : "slate"}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      {getExpenseTypeLabel(item.type)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      {getFrequencyLabel(item.frequency)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      {item.category ?? "Sin categoria"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    <MoneyAmount value={item.amount} />
                  </p>
                  <p className="text-xs text-muted-foreground">{getNextImpactLabel(item.daysUntilNextDue)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-[20px] border border-border/70 bg-muted/10 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Proximo impacto
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {item.nextDueDate ? formatDate(item.nextDueDate) : "Sin fecha"}
                  </p>
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Luego
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {item.followingDueDate ? formatDate(item.followingDueDate) : "Sin proxima repeticion"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
