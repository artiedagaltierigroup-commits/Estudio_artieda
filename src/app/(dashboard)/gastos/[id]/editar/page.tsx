import { getExpense, updateExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Repeat } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarGastoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();
  if (expense.origin === "SAVINGS") redirect(`/gastos/${id}`);

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

      {expense.recurringExpenseId ? (
        <SectionCard
          eyebrow="Recurrente vinculado"
          title="Este gasto viene de una plantilla recurrente"
          description="Aca estas editando el gasto real que ya impacta en caja. Para cambiar si el recurrente es automatico o con checklist, edita la plantilla original."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              El cambio se aplica a los proximos vencimientos del recurrente. Los gastos reales ya generados mantienen su registro.
            </p>
            <Button asChild>
              <Link href={`/gastos/recurrentes/${expense.recurringExpenseId}/editar`}>
                <Repeat className="h-4 w-4" />
                Editar plantilla recurrente
              </Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <ExpenseForm
        action={handleSubmit}
        cancelHref={`/gastos/${id}`}
        submitLabel="Guardar cambios"
        initialValues={expense}
      />
    </div>
  );
}
