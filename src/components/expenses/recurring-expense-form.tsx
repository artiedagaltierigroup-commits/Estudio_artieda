import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildExpenseCategoryOptions } from "@/lib/expense-categories";
import { Save } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface RecurringExpenseFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  initialValues?: {
    description?: string | null;
    amount?: string | null;
    type?: "OPERATIVE" | "TAX" | "SERVICE" | "OTHER" | null;
    category?: string | null;
    frequency?: "monthly" | "quarterly" | "yearly" | null;
    startDate?: string | null;
    endDate?: string | null;
    active?: boolean | null;
    notes?: string | null;
  };
}

export function RecurringExpenseForm({
  action,
  cancelHref,
  submitLabel,
  initialValues,
}: RecurringExpenseFormProps) {
  const categoryOptions = buildExpenseCategoryOptions(initialValues?.category);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <form action={action} className="space-y-6">
        <SectionCard
          eyebrow="Plantilla"
          title="Datos del recurrente"
          description="Base para proyectar gastos fijos sin recargar el flujo mensual."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descripcion</Label>
              <Input
                id="description"
                name="description"
                required
                defaultValue={initialValues?.description ?? ""}
                placeholder="Ejemplo: alquiler, internet o software"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <CurrencyInput
                id="amount"
                name="amount"
                required
                defaultValue={initialValues?.amount ?? ""}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <select
                id="frequency"
                name="frequency"
                defaultValue={initialValues?.frequency ?? "monthly"}
                className={selectClassName}
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select id="type" name="type" defaultValue={initialValues?.type ?? "OPERATIVE"} className={selectClassName}>
                <option value="OPERATIVE">Operativo</option>
                <option value="TAX">Impuesto</option>
                <option value="SERVICE">Servicio</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                name="category"
                defaultValue={initialValues?.category ?? "Varios"}
                className={selectClassName}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input id="startDate" name="startDate" type="date" required defaultValue={initialValues?.startDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de fin opcional</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={initialValues?.endDate ?? ""} />
              <p className="text-xs text-muted-foreground">
                Si la dejas vacia, este gasto seguira activo hasta que lo pases manualmente a inactivo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">Estado</Label>
              <select
                id="active"
                name="active"
                defaultValue={initialValues?.active === false ? "false" : "true"}
                className={selectClassName}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={initialValues?.notes ?? ""}
                placeholder="Aclaraciones utiles para la proyeccion."
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            {submitLabel}
          </Button>
        </div>
      </form>

      <SectionCard
        eyebrow="Uso"
        title="Que representa"
        description="Lo recurrente alimenta proyecciones y calendario, no reemplaza el gasto real."
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Si deja de aplicar, conviene pasarlo a inactivo en vez de borrarlo.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Puede no tener fecha fin si se trata de un gasto fijo sin limite.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
