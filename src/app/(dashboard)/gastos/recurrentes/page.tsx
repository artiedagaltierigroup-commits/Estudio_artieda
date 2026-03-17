import { createRecurringExpense, getRecurringExpenses } from "@/actions/recurring-expenses";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, getExpenseTypeLabel, getFrequencyLabel } from "@/lib/utils";
import { ArrowLeft, RefreshCcw, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";

  formData.set("active", "true");
  await createRecurringExpense(formData);
  redirect("/gastos/recurrentes");
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function GastosRecurrentesPage() {
  const list = await getRecurringExpenses();
  const activeCount = list.filter((item) => item.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plantillas"
        title="Gastos recurrentes"
        description="Plantillas base para proyeccion mensual, trimestral o anual sin tener que cargar el mismo gasto una y otra vez."
        stats={[
          { label: "Registros", value: `${list.length}` },
          { label: "Activos", value: `${activeCount}` },
          { label: "Frecuencias", value: "Mensual, trimestral y anual" },
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <SectionCard
          eyebrow="Nueva plantilla"
          title="Agregar gasto recurrente"
          description="Queda pensado para proyectar el mes sin duplicar carga manual."
        >
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripcion</Label>
                <Input id="description" name="description" required placeholder="Ejemplo: alquiler, internet o software" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" name="amount" type="number" step="1" required placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frecuencia</Label>
                <select id="frequency" name="frequency" className={selectClassName}>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select id="type" name="type" className={selectClassName}>
                  <option value="OPERATIVE">Operativo</option>
                  <option value="TAX">Impuesto</option>
                  <option value="SERVICE">Servicio</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha fin</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" className="min-h-[110px]" placeholder="Aclaraciones utiles para la proyeccion." />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Save className="h-4 w-4" />
                Guardar plantilla
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Criterio"
          title="Uso recomendado"
          description="Este modulo esta pensado para mirar proyeccion, no caja real."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Lo recurrente complementa los gastos reales del modulo principal.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Si el gasto deja de existir, se desactiva la plantilla y listo.
            </div>
          </div>
        </SectionCard>
      </div>

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
                    {getExpenseTypeLabel(item.type)}
                  </span>
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    {getFrequencyLabel(item.frequency)}
                  </span>
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                    Desde {item.startDate}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{formatCurrency(item.amount)}</p>
                {item.endDate ? <p className="text-xs text-muted-foreground">Hasta {item.endDate}</p> : null}
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
