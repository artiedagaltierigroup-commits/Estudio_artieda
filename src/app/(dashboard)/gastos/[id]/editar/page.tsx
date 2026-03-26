import { getExpense, updateExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarGastoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateExpense(id, formData);
    if (result.success) redirect(`/gastos/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mantenimiento"
        title={`Editar ${expense.description}`}
        description="Actualiza los datos del egreso sin perder su trazabilidad en el sistema."
        stats={[
          { label: "Modulo", value: "Gastos" },
          { label: "Accion", value: "Edicion" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/gastos/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver al gasto
            </Link>
          </Button>
        }
      />

      <ExpenseForm
        action={handleSubmit}
        cancelHref={`/gastos/${id}`}
        submitLabel="Guardar cambios"
        initialValues={expense}
      />
    </div>
  );
}
