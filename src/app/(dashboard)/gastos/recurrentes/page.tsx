import { createRecurringExpense, getRecurringExpenses } from "@/actions/recurring-expenses";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { RecurringExpenseForm } from "@/components/expenses/recurring-expense-form";
import { formatCurrency, getExpenseTypeLabel, getFrequencyLabel, getPriorityLabel, getRecurringModeLabel } from "@/lib/utils";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  const result = await createRecurringExpense(formData);
  if (result.success) redirect("/gastos/recurrentes");
}

export default async function GastosRecurrentesPage() {
  const list = await getRecurringExpenses();
  const activeCount = list.filter((item) => item.active).length;
  const payableCount = list.filter((item) => item.mode === "PAYABLE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plantillas"
        title="Gastos recurrentes"
        description="Plantillas base para proyeccion mensual, trimestral o anual sin tener que cargar el mismo gasto una y otra vez."
        stats={[
          { label: "Registros", value: `${list.length}` },
          { label: "Activos", value: `${activeCount}` },
          { label: "Por pagar", value: `${payableCount}` },
          { label: "Frecuencias", value: "Mensual, trimestral, semestral y anual" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gastos">
              <ArrowLeft className="h-4 w-4" />
              Volver a gastos
            </Link>
          </Button>
        }
      />

      <RecurringExpenseForm action={handleCreate} cancelHref="/gastos" submitLabel="Guardar gasto recurrente" />

      {list.length === 0 ? (
        <EmptyState
          icon={RefreshCcw}
          title="Todavia no hay plantillas recurrentes"
          description="Cuando cargues una, el calendario financiero y las proyecciones del dashboard van a poder apoyarse en ella."
        />
      ) : (
        <SectionCard
          eyebrow="Plantillas activas"
          title="Listado de recurrentes"
          description="Base inicial de gastos que se repiten por frecuencia."
          contentClassName="space-y-3"
        >
          {list.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-white/85 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{item.description}</p>
                  <StatusChip label={item.active ? "Activo" : "Inactivo"} tone={item.active ? "sage" : "slate"} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    {getRecurringModeLabel(item.mode)}
                  </span>
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    {getExpenseTypeLabel(item.type)}
                  </span>
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    {getFrequencyLabel(item.frequency)}
                  </span>
                  {item.mode === "PAYABLE" ? (
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Prioridad {getPriorityLabel(item.priority).toLowerCase()}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    {item.category ?? "Sin categoria"}
                  </span>
                  {item.mode === "AUTOMATIC" ? (
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Desde {item.startDate}
                    </span>
                  ) : (
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Dia {item.payableDayOfMonth} · avisa {item.notifyDaysBefore} dia(s) antes
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(item.amount)}</p>
                  {item.endDate ? <p className="text-xs text-muted-foreground">Hasta {item.endDate}</p> : null}
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/gastos/recurrentes/${item.id}/editar`}>Editar</Link>
                </Button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
