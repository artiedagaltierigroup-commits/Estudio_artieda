import { getRecurringExpense, updateRecurringExpense } from "@/actions/recurring-expenses";
import { RecurringExpenseForm } from "@/components/expenses/recurring-expense-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarRecurrentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recurring = await getRecurringExpense(id);
  if (!recurring) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateRecurringExpense(id, formData);
    if (result.success) redirect("/gastos/recurrentes");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mantenimiento"
        title={`Editar ${recurring.description}`}
        description="Actualiza frecuencia, categoria, fechas o estado de la plantilla recurrente."
        stats={[
          { label: "Modulo", value: "Recurrentes" },
          { label: "Accion", value: "Edicion" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gastos/recurrentes">
              <ArrowLeft className="h-4 w-4" />
              Volver a recurrentes
            </Link>
          </Button>
        }
      />

      <RecurringExpenseForm
        action={handleSubmit}
        cancelHref="/gastos/recurrentes"
        submitLabel="Guardar cambios"
        initialValues={recurring}
      />
    </div>
  );
}
