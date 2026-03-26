import { getCases } from "@/actions/cases";
import { createCharge } from "@/actions/charges";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ChargeForm } from "@/components/charges/charge-form";
import { ArrowLeft, Briefcase, CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  const result = await createCharge(formData);
  if (result.success) redirect(`/cobros/${result.chargeId}`);
}

export default async function NuevoCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>;
}) {
  const { caseId } = await searchParams;
  const cases = await getCases({ status: "ACTIVE" });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alta base"
        title="Nuevo cobro"
        description="Carga inicial del compromiso de cobro. El estado visible se deriva automaticamente por saldo y vencimiento."
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

      {cases.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Primero hace falta crear un caso"
          description="El cobro siempre queda asociado a un expediente activo. Cuando exista un caso en curso, esta pantalla ya queda lista para usar."
          action={
            <Button asChild>
              <Link href="/casos/nuevo">
                <Briefcase className="h-4 w-4" />
                Crear caso
              </Link>
            </Button>
          }
        />
      ) : (
        <ChargeForm
          action={handleCreate}
          cancelHref="/cobros"
          submitLabel="Guardar cobro"
          cases={cases}
          defaultCaseId={caseId}
        />
      )}
    </div>
  );
}
