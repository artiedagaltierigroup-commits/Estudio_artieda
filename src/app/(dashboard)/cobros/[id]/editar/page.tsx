import { getCases } from "@/actions/cases";
import { getCharge, updateCharge } from "@/actions/charges";
import { ChargeForm } from "@/components/charges/charge-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarCobroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [charge, activeCases] = await Promise.all([getCharge(id), getCases({ status: "ACTIVE" })]);
  if (!charge) notFound();

  const cases = activeCases.some((item) => item.id === charge.caseId)
    ? activeCases
    : [charge.case, ...activeCases].filter(
        (item, index, array) => item && array.findIndex((candidate) => candidate?.id === item.id) === index
      );

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateCharge(id, formData);
    if (result.success) redirect(`/cobros/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mantenimiento"
        title={`Editar ${charge.description}`}
        description="Actualiza monto, fechas y notas del compromiso de cobro sin perder su historial."
        stats={[
          { label: "Caso", value: charge.case?.title ?? "Sin caso" },
          { label: "Cliente", value: charge.case?.client?.name ?? "Sin cliente" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/cobros/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver al cobro
            </Link>
          </Button>
        }
      />

      <ChargeForm
        action={handleSubmit}
        cancelHref={`/cobros/${id}`}
        submitLabel="Guardar cambios"
        cases={cases}
        initialValues={charge}
      />
    </div>
  );
}
