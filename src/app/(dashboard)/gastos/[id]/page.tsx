import { getExpense, voidExpense } from "@/actions/expenses";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, getExpenseTypeLabel } from "@/lib/utils";
import { ArrowLeft, PencilLine, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function GastoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  async function handleVoid(formData: FormData) {
    "use server";
    await voidExpense(id, String(formData.get("reason") ?? ""));
    redirect(`/gastos/${id}`);
  }

  const isVoided = Boolean(expense.voidedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ficha del gasto"
        title={expense.description}
        description="Detalle del egreso real con datos de imputacion, comprobante y anulación lógica."
        stats={[
          { label: "Monto", value: <MoneyAmount value={expense.amount} /> },
          { label: "Fecha", value: formatDate(expense.date) },
          { label: "Tipo", value: getExpenseTypeLabel(expense.type) },
          { label: "Estado", value: isVoided ? "Anulado" : "Activo" },
        ]}
        actions={
          <>
            <StatusChip label={isVoided ? "Anulado" : "Activo"} tone={isVoided ? "slate" : "danger"} />
            <Button asChild variant="outline">
              <Link href="/gastos">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            {!isVoided ? (
              <Button asChild variant="outline">
                <Link href={`/gastos/${id}/editar`}>
                  <PencilLine className="h-4 w-4" />
                  Editar gasto
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard
          eyebrow="Registro"
          title="Datos del gasto"
          description="Informacion base del movimiento cargado."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo</p>
              <p className="mt-2 text-sm font-medium text-foreground">{getExpenseTypeLabel(expense.type)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categoria</p>
              <p className="mt-2 text-sm font-medium text-foreground">{expense.category ?? "Sin categoria"}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fecha real</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(expense.date)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mes imputado</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(expense.appliesToMonth)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5 sm:col-span-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Comprobante</p>
              <p className="mt-2 text-sm font-medium text-foreground">{expense.receiptUrl ?? "Sin comprobante cargado"}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-border/70 bg-white/80 p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notas</p>
            <p className="mt-2 text-sm leading-7 text-foreground">
              {expense.notes ?? "Todavia no hay notas internas para este gasto."}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Anulacion"
          title="Anular gasto"
          description="Si el egreso fue cargado por error, conviene anularlo en vez de perder el rastro."
        >
          {isVoided ? (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              Este gasto fue anulado el {expense.voidedAt ? formatDateTime(expense.voidedAt) : "-"}.
              {expense.voidReason ? ` Motivo: ${expense.voidReason}` : ""}
            </div>
          ) : (
            <form action={handleVoid} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea id="reason" name="reason" placeholder="Motivo de la anulacion del gasto." />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline">
                  <XCircle className="h-4 w-4" />
                  Anular gasto
                </Button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
