import { getCases } from "@/actions/cases";
import { createCharge } from "@/actions/charges";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Briefcase, CreditCard, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  const result = await createCharge(formData);
  if (result.success) redirect("/cobros");
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function NuevoCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>;
}) {
  const { caseId } = await searchParams;
  const cases = await getCases();

  if (cases.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Alta base"
          title="Nuevo cobro"
          description="Antes de cargar un cobro necesitamos al menos un caso activo o historico para asociarlo."
          actions={
            <Button asChild variant="outline">
              <Link href="/cobros">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={CreditCard}
          title="Primero hace falta crear un caso"
          description="El cobro siempre queda asociado a un expediente. Cuando el caso exista, esta pantalla ya queda lista para usar."
          action={
            <Button asChild>
              <Link href="/casos/nuevo">
                <Briefcase className="h-4 w-4" />
                Crear caso
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alta base"
        title="Nuevo cobro"
        description="Carga inicial del compromiso de cobro. El estado despues se deriva automaticamente por saldo y vencimiento."
        stats={[
          { label: "Casos disponibles", value: `${cases.length}` },
          { label: "Regla clave", value: "Estado derivado" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/cobros">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <form action={handleCreate} className="space-y-6">
          <SectionCard
            eyebrow="Asociacion"
            title="Caso y descripcion"
            description="Este cobro quedara visible tanto en el caso como en el panel financiero."
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseId">Caso</Label>
                <select
                  id="caseId"
                  name="caseId"
                  required
                  defaultValue={caseId ?? ""}
                  className={selectClassName}
                >
                  <option value="">Seleccionar caso...</option>
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.client?.name} - {item.title}
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
                  placeholder="Ejemplo: anticipo, cuota 1, saldo final o audiencia"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Monto"
            title="Importe y vencimiento"
            description="Aca definis el compromiso economico inicial. Los pagos parciales vendran despues."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amountTotal">Monto total</Label>
                <Input id="amountTotal" name="amountTotal" type="number" step="1" required placeholder="0" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ejemplo: pactado en dos partes o requiere seguimiento telefonico."
                />
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button asChild variant="outline">
              <Link href="/cobros">Cancelar</Link>
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Guardar cobro
            </Button>
          </div>
        </form>

        <SectionCard
          eyebrow="Reglas base"
          title="Que pasa despues"
          description="Este alta ya queda alineada con las decisiones de arquitectura."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              El estado visible del cobro se deriva desde saldo pendiente y fecha de vencimiento.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Los pagos parciales se registran aparte y actualizan automaticamente el saldo.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Desde la ficha del caso despues vas a poder ver todo el historial asociado.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
