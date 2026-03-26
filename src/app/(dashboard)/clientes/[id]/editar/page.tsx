import { getClientRecord, updateClient } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientRecord(id);
  if (!client) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateClient(id, formData);
    if (result.success) redirect(`/clientes/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mantenimiento"
        title={`Editar ${client.name}`}
        description="Ajusta los datos base del cliente sin salir del modulo. Los cambios impactan en toda la operacion relacionada."
        stats={[
          { label: "Modulo", value: "Clientes" },
          { label: "Accion", value: "Edicion" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/clientes/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver al detalle
            </Link>
          </Button>
        }
      />
      <ClientForm
        action={handleSubmit}
        cancelHref={`/clientes/${id}`}
        submitLabel="Guardar cambios"
        initialValues={client}
      />
    </div>
  );
}
