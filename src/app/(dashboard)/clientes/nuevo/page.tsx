import { createClient_action } from "@/actions/clients";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSubmit(formData: FormData) {
  "use server";
  const result = await createClient_action(formData);
  if (result.success) redirect("/clientes");
}

export default function NuevoClientePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alta base"
        title="Nuevo cliente"
        description="Carga inicial de la ficha del cliente. Con esto ya queda listo para asociar casos, cobros y recordatorios."
        stats={[
          { label: "Modulo", value: "Clientes" },
          { label: "Siguiente paso", value: "Abrir un caso" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <form action={handleSubmit} className="space-y-6">
          <SectionCard
            eyebrow="Ficha primaria"
            title="Datos de contacto"
            description="En esta etapa alcanza con cargar la base para poder empezar a trabajar."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Nombre y apellido o razon social" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Identificacion fiscal</Label>
                <Input id="taxId" name="taxId" placeholder="CUIT, DNI u otra referencia" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" name="phone" type="tel" placeholder="Numero de contacto" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="cliente@email.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Direccion</Label>
                <Input id="address" name="address" placeholder="Direccion o localidad" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Contexto"
            title="Notas internas"
            description="Observaciones utiles para la relacion profesional o el seguimiento."
          >
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" placeholder="Ejemplo: prefiere contacto por WhatsApp o tiene documentacion pendiente." />
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button asChild variant="outline">
              <Link href="/clientes">Cancelar</Link>
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Guardar cliente
            </Button>
          </div>
        </form>

        <SectionCard
          eyebrow="Guia rapida"
          title="Que conviene cargar ahora"
          description="Solo lo suficiente para no frenar el alta."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Nombre y una via de contacto ya alcanzan para empezar.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Despues vas a poder sumar casos, cobros y recordatorios desde su ficha.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              No hace falta completar todo antes de guardar.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
