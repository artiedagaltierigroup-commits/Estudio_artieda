import { createCase } from "@/actions/cases";
import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Briefcase, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSubmit(formData: FormData) {
  "use server";
  const result = await createCase(formData);
  if (result.success) redirect("/casos");
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function NuevoCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await getClients();

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Alta base"
          title="Nuevo caso"
          description="Antes de abrir un caso necesitamos al menos un cliente cargado para mantener la estructura ordenada."
          actions={
            <Button asChild variant="outline">
              <Link href="/casos">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={Briefcase}
          title="Primero hace falta crear un cliente"
          description="Una vez creado, vas a poder volver aca y abrir el expediente directamente asociado."
          action={
            <Button asChild>
              <Link href="/clientes/nuevo">
                <UserPlus className="h-4 w-4" />
                Crear cliente
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
        title="Nuevo caso"
        description="Carga inicial del expediente. Esta pantalla ya deja resuelta la asociacion con cliente y el contexto minimo del caso."
        stats={[
          { label: "Clientes disponibles", value: `${clients.length}` },
          { label: "Flujo siguiente", value: "Registrar cobro" },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/casos">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/clientes/nuevo">
                <UserPlus className="h-4 w-4" />
                Crear cliente
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <form action={handleSubmit} className="space-y-6">
          <SectionCard
            eyebrow="Relacion"
            title="Cliente y datos base"
            description="Si el cliente todavia no existe, podes crearlo desde el boton superior y volver aca."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clientId">Cliente</Label>
                <select
                  id="clientId"
                  name="clientId"
                  required
                  defaultValue={clientId ?? ""}
                  className={selectClassName}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Nombre del caso</Label>
                <Input id="title" name="title" required placeholder="Ejemplo: Sucesion Perez o Reajuste previsional" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Contexto breve del expediente, objetivo o notas operativas."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Gestion"
            title="Honorarios y fechas"
            description="Configuracion minima para seguir el caso desde el panel."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fee">Honorarios</Label>
                <Input id="fee" name="fee" type="number" step="1000" placeholder="Monto total pactado" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select id="status" name="status" defaultValue="ACTIVE" className={selectClassName}>
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="CLOSED">Cerrado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de cierre</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button asChild variant="outline">
              <Link href="/casos">Cancelar</Link>
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Guardar caso
            </Button>
          </div>
        </form>

        <SectionCard
          eyebrow="Sugerencia"
          title="Secuencia ideal"
          description="Este alta esta pensada para salir rapido y seguir despues."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              1. Elegi el cliente o crea uno nuevo.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              2. Guarda el caso con el contexto minimo.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              3. Registra el primer cobro pactado desde la ficha del caso.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
