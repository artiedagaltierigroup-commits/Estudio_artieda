import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import Link from "next/link";

interface ClientFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  initialValues?: {
    name?: string | null;
    taxId?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    languages?: string | null;
    notes?: string | null;
  };
}

export function ClientForm({ action, cancelHref, submitLabel, initialValues }: ClientFormProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <form action={action} className="space-y-6">
        <SectionCard
          eyebrow="Ficha primaria"
          title="Datos de contacto"
          description="Carga base del cliente para que el sistema ya pueda relacionarlo con casos, cobros y recordatorios."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Nombre y apellido o razon social"
                defaultValue={initialValues?.name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Identificacion fiscal</Label>
              <Input
                id="taxId"
                name="taxId"
                placeholder="CUIT, DNI u otra referencia"
                defaultValue={initialValues?.taxId ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Numero de contacto"
                defaultValue={initialValues?.phone ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="cliente@email.com"
                defaultValue={initialValues?.email ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input
                id="address"
                name="address"
                placeholder="Direccion o localidad"
                defaultValue={initialValues?.address ?? ""}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="languages">Idiomas</Label>
              <Input
                id="languages"
                name="languages"
                placeholder="Ejemplo: Espanol, Ingles, Portugues"
                defaultValue={initialValues?.languages ?? ""}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Contexto"
          title="Notas internas"
          description="Observaciones utiles para la relacion profesional o para el seguimiento diario."
        >
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Ejemplo: prefiere contacto por WhatsApp o tiene documentacion pendiente."
            />
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
        eyebrow="Guia rapida"
        title="Que conviene mantener al dia"
        description="Solo lo necesario para que la ficha siga siendo util durante la operacion."
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Nombre y una via de contacto ya alcanzan para operar sin friccion.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Esta ficha va a alimentar casos, cobros, recordatorios y metricas del dashboard.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            Si cambia algun dato, conviene corregirlo aca para no duplicar inconsistencias en otros modulos.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
