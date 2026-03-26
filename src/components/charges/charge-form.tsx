import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ChargeFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  cases: Array<{
    id: string;
    title: string;
    client?: {
      name?: string | null;
    } | null;
  }>;
  defaultCaseId?: string | null;
  initialValues?: {
    caseId?: string | null;
    description?: string | null;
    amountTotal?: string | null;
    dueDate?: string | null;
    notes?: string | null;
  };
}

export function ChargeForm({
  action,
  cancelHref,
  submitLabel,
  cases,
  defaultCaseId,
  initialValues,
}: ChargeFormProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <form action={action} className="space-y-6">
        <SectionCard
          eyebrow="Asociacion"
          title="Caso y descripcion"
          description="Este cobro quedara visible tanto en el expediente como en el panel financiero."
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseId">Caso</Label>
              <select
                id="caseId"
                name="caseId"
                required
                defaultValue={initialValues?.caseId ?? defaultCaseId ?? ""}
                className={selectClassName}
              >
                <option value="">Seleccionar caso...</option>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.client?.name ?? "Sin cliente"} - {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Input
                id="description"
                name="description"
                required
                defaultValue={initialValues?.description ?? ""}
                placeholder="Ejemplo: anticipo, cuota 1, saldo final o audiencia"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Monto"
          title="Importe y vencimiento"
          description="Aca defines el compromiso economico y, si corresponde, puedes marcarlo como ya cobrado."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amountTotal">Monto total</Label>
              <CurrencyInput
                id="amountTotal"
                name="amountTotal"
                required
                defaultValue={initialValues?.amountTotal ?? ""}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha de vencimiento</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={initialValues?.dueDate ?? ""} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-white/80 px-4 py-4">
                <Checkbox id="markAsPaid" name="markAsPaid" />
                <div className="space-y-1">
                  <Label htmlFor="markAsPaid">Marcar como ya pagado</Label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Si lo activas, al guardar se registra automaticamente un pago total con la fecha de hoy.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={initialValues?.notes ?? ""}
                placeholder="Ejemplo: pactado en dos partes o requiere seguimiento telefonico."
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
        eyebrow="Reglas base"
        title="Como se interpreta"
        description="Este modulo sigue usando estado derivado para no duplicar verdad."
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            El estado visible se deriva desde saldo pendiente, fecha de vencimiento y cancelacion.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Si un cobro ya entro, puedes marcarlo pagado al crearlo y el sistema registra el pago completo.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Si despues hay pagos parciales o cambios, se siguen cargando desde la ficha del cobro.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
