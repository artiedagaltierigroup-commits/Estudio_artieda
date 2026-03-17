import { createExpense, getExpenses } from "@/actions/expenses";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, getExpenseTypeLabel } from "@/lib/utils";
import { Plus, Receipt, ReceiptText, RefreshCcw, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  await createExpense(formData);
  redirect("/gastos");
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function GastosPage() {
  const expenseList = await getExpenses();
  const total = expenseList.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const operativeCount = expenseList.filter((item) => item.type === "OPERATIVE").length;
  const latestExpense = expenseList[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Egresos"
        title="Gastos"
        description="Registro rapido de gastos reales del estudio. La meta en esta etapa es capturar bien el movimiento y dejar la analitica lista para crecer."
        stats={[
          { label: "Registros", value: `${expenseList.length}` },
          { label: "Operativos", value: `${operativeCount}` },
          { label: "Total cargado", value: formatCurrency(total) },
          { label: "Ultimo movimiento", value: latestExpense ? formatDate(latestExpense.date) : "Sin datos" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gastos/recurrentes">
              <RefreshCcw className="h-4 w-4" />
              Recurrentes
            </Link>
          </Button>
        }
      />

      {expenseList.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total cargado"
            value={formatCurrency(total)}
            subtitle="Suma de gastos registrados manualmente."
            icon={Wallet}
            tone="danger"
          />
          <MetricCard
            label="Ultimo gasto"
            value={latestExpense ? formatCurrency(latestExpense.amount) : "$0"}
            subtitle={latestExpense ? latestExpense.description : "Sin movimientos todavia."}
            icon={ReceiptText}
            tone="rose"
          />
          <MetricCard
            label="Operativos"
            value={`${operativeCount} gasto(s)`}
            subtitle="Cantidad de movimientos clasificados como operativos."
            icon={Receipt}
            tone="slate"
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <SectionCard
          eyebrow="Carga rapida"
          title="Registrar gasto"
          description="Alta simple para no frenar el registro del egreso en el dia a dia."
        >
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripcion</Label>
                <Input id="description" name="description" required placeholder="Ejemplo: papeleria, tramite o servicio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" name="amount" type="number" step="1" required placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select id="type" name="type" className={selectClassName}>
                  <option value="OPERATIVE">Operativo</option>
                  <option value="TAX">Impuesto</option>
                  <option value="SERVICE">Servicio</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" className="min-h-[110px]" placeholder="Referencia interna o detalle del gasto." />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Guardar gasto
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Relacion"
          title="Como leer este modulo"
          description="Base simple, pensada para no perder trazabilidad."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              Los gastos manuales conviven con las plantillas recurrentes sin mezclarse.
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
              La vision financiera completa despues cruza estos datos con ingresos cobrados.
            </div>
          </div>
        </SectionCard>
      </div>

      {expenseList.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Todavia no hay gastos registrados"
          description="Cuando empieces a cargarlos, esta vista va a mostrar el total, el historial y la relacion con la caja del estudio."
        />
      ) : (
        <SectionCard
          eyebrow="Historial"
          title="Movimientos cargados"
          description="Listado simple y rapido de los gastos ya registrados."
          contentClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35">
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Descripcion
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {expenseList.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{item.description}</p>
                        {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{getExpenseTypeLabel(item.type)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#9d4d4d]">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
