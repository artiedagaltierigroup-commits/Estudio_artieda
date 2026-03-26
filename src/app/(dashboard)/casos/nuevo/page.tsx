import { createCase } from "@/actions/cases";
import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { CaseForm } from "@/components/cases/case-form";
import { ArrowLeft, Briefcase } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSubmit(formData: FormData) {
  "use server";
  const result = await createCase(formData);
  if (result.success) redirect(`/casos/${result.caseId}`);
}

export default async function NuevoCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await getClients();

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
          <Button asChild variant="outline">
            <Link href="/casos">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Todavia no hay clientes cargados"
          description="Puedes crear un cliente directamente dentro de este formulario usando el modo 'crear cliente nuevo', asi que no hace falta salir del flujo."
        />
      ) : null}

      <CaseForm
        action={handleSubmit}
        cancelHref="/casos"
        submitLabel="Guardar caso"
        clients={clients}
        defaultClientId={clientId}
      />
    </div>
  );
}
