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

interface ExpenseFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  initialValues?: {
    description?: string | null;
    amount?: string | null;
    type?: "OPERATIVE" | "TAX" | "SERVICE" | "OTHER" | null;
    category?: string | null;
    date?: string | null;
    receiptUrl?: string | null;
    notes?: string | null;
  };
}

export function ExpenseForm({ action, cancelHref, submitLabel, initialValues }: ExpenseFormProps) {
  const categoryOptions = buildExpenseCategoryOptions(initialValues?.category);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <form action={action} className="space-y-6">
        <SectionCard
          eyebrow="Carga"
          title="Datos del gasto"
          description="Base simple para registrar egreso real y mantener trazabilidad."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descripcion</Label>
              <Input
                id="description"
                name="description"
                required
                defaultValue={initialValues?.description ?? ""}
                placeholder="Ejemplo: papeleria, tramite o servicio"
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
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" required defaultValue={initialValues?.date ?? ""} />
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
              <Label htmlFor="receiptUrl">Comprobante</Label>
              <Input
                id="receiptUrl"
                name="receiptUrl"
                defaultValue={initialValues?.receiptUrl ?? ""}
                placeholder="URL o referencia interna"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={initialValues?.notes ?? ""}
                placeholder="Referencia interna o detalle del gasto."
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
        eyebrow="Criterio"
        title="Como impacta"
        description="Este modulo alimenta la lectura de caja real y resultado neto."
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            El gasto real afecta metricas y paneles apenas queda registrado.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Si se cargó mal, conviene anularlo en vez de perder trazabilidad.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            La fecha del gasto define directamente el mes en el que impacta.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
