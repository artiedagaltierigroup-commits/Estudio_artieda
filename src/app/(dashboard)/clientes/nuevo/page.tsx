import { createClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSubmit(formData: FormData) {
  "use server";
  const result = await createClientAction(formData);
  if (result.success) redirect(`/clientes/${result.clientId}`);
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

      <ClientForm action={handleSubmit} cancelHref="/clientes" submitLabel="Guardar cliente" />
    </div>
  );
}
