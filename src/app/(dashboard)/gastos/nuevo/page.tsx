import { createExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  const result = await createExpense(formData);
  if (result.success) redirect(`/gastos/${result.expenseId}`);
}

export default function NuevoGastoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alta base"
        title="Nuevo gasto"
        description="Registro de egreso real con categoria, mes imputado y soporte para futura trazabilidad."
        stats={[
          { label: "Modulo", value: "Gastos" },
          { label: "Siguiente paso", value: "Analizar impacto" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gastos">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <ExpenseForm action={handleCreate} cancelHref="/gastos" submitLabel="Guardar gasto" />
    </div>
  );
}
