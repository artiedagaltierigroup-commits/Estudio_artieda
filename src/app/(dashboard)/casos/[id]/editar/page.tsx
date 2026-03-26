import { getCaseRecord, updateCase } from "@/actions/cases";
import { getClients } from "@/actions/clients";
import { CaseForm } from "@/components/cases/case-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarCasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [currentCase, clients] = await Promise.all([getCaseRecord(id), getClients()]);
  if (!currentCase) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateCase(id, formData);
    if (result.success) redirect(`/casos/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mantenimiento"
        title={`Editar ${currentCase.title}`}
        description="Actualiza estado, prioridad, cliente y datos base del expediente sin salir del modulo."
        stats={[
          { label: "Modulo", value: "Casos" },
          { label: "Accion", value: "Edicion" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/casos/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver al detalle
            </Link>
          </Button>
        }
      />

      <CaseForm
        action={handleSubmit}
        cancelHref={`/casos/${id}`}
        submitLabel="Guardar cambios"
        clients={clients}
        initialValues={currentCase}
      />
    </div>
  );
}
