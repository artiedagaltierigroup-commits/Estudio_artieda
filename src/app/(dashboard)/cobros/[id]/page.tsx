import { getCharge, updateDueDate, cancelCharge } from "@/actions/charges";
import { createPayment, deletePayment } from "@/actions/payments";
import { PaymentForm } from "@/components/charges/payment-form";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChargeStatusTone } from "@/lib/presentation";
import { formatCurrency, formatDate, formatDateTime, getChargeStatusLabel } from "@/lib/utils";
import {
  AlarmClockCheck,
  ArrowLeft,
  CalendarClock,
  CreditCard,
  HandCoins,
  PencilLine,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CobroDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const charge = await getCharge(id);
  if (!charge) notFound();

  async function handlePayment(formData: FormData) {
    "use server";
    await createPayment(formData);
  }

  async function handleReschedule(formData: FormData) {
    "use server";
    await updateDueDate(
      id,
      String(formData.get("dueDate") ?? ""),
      String(formData.get("followUpDate") ?? "")
    );
  }

  async function handleCancel(formData: FormData) {
    "use server";
    await cancelCharge(id, String(formData.get("reason") ?? ""));
    redirect(`/cobros/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ficha del cobro"
        title={charge.description}
        description={`Caso: ${charge.case?.title ?? "Sin caso"} · Cliente: ${charge.case?.client?.name ?? "Sin cliente"}`}
        stats={[
          { label: "Total", value: formatCurrency(charge.amountTotal) },
          { label: "Cobrado", value: formatCurrency(charge.amountPaid) },
          { label: "Saldo", value: formatCurrency(charge.balance) },
          { label: "Estado", value: getChargeStatusLabel(charge.derivedStatus) },
        ]}
        actions={
          <>
            <StatusChip
              label={getChargeStatusLabel(charge.derivedStatus)}
              tone={getChargeStatusTone(charge.derivedStatus)}
            />
            <Button asChild variant="outline">
              <Link href="/cobros">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/cobros/${id}/editar`}>
                <PencilLine className="h-4 w-4" />
                Editar cobro
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cobrado"
          value={formatCurrency(charge.amountPaid)}
          subtitle={`${charge.payments.length} pago(s) registrados`}
          icon={HandCoins}
          tone="sage"
        />
        <MetricCard
          label="Saldo pendiente"
          value={formatCurrency(charge.balance)}
          subtitle="Monto que todavia falta recuperar."
          icon={CreditCard}
          tone={charge.balance > 0 ? "amber" : "slate"}
        />
        <MetricCard
          label="Vencimiento"
          value={formatDate(charge.dueDate)}
          subtitle={charge.followUpDate ? `Seguimiento ${formatDate(charge.followUpDate)}` : "Sin seguimiento cargado"}
          icon={CalendarClock}
          tone={charge.derivedStatus === "OVERDUE" ? "danger" : "lilac"}
        />
        <MetricCard
          label="Cancelacion"
          value={charge.cancelledAt ? formatDateTime(charge.cancelledAt) : "Activa"}
          subtitle={charge.cancellationReason ?? "Sin motivo de cancelacion"}
          icon={XCircle}
          tone={charge.cancelledAt ? "slate" : "rose"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Registro"
          title="Datos del cobro"
          description="Informacion base del compromiso financiero."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Caso</p>
              <p className="mt-2 text-sm font-medium text-foreground">{charge.case?.title ?? "Sin caso"}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cliente</p>
              <p className="mt-2 text-sm font-medium text-foreground">{charge.case?.client?.name ?? "Sin cliente"}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vencimiento</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(charge.dueDate)}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Seguimiento</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDate(charge.followUpDate)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-border/70 bg-white/80 p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notas</p>
            <p className="mt-2 text-sm leading-7 text-foreground">
              {charge.notes ?? "Todavia no hay notas para este cobro."}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Operacion"
          title="Registrar pago"
          description="Desde aqui puedes cargar pago total o parcial y el saldo se recalcula solo."
        >
          {charge.derivedStatus === "CANCELLED" || charge.balance <= 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              {charge.derivedStatus === "CANCELLED"
                ? "Este cobro esta cancelado y no admite nuevos pagos."
                : "Este cobro ya esta completamente pagado."}
            </div>
          ) : (
            <PaymentForm action={handlePayment} chargeId={charge.id} remainingBalance={charge.balance} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Ajustes"
          title="Vencimiento y seguimiento"
          description="Permite mover el compromiso sin alterar el historial de pagos."
        >
          <form action={handleReschedule} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Nueva fecha de vencimiento</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={charge.dueDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Nueva fecha de seguimiento</Label>
              <Input id="followUpDate" name="followUpDate" type="date" defaultValue={charge.followUpDate ?? ""} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">
                <AlarmClockCheck className="h-4 w-4" />
                Guardar fechas
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Cancelacion"
          title="Cancelar cobro"
          description="Solo usar si este compromiso deja de existir. El historial de pagos no se borra."
        >
          {charge.cancelledAt ? (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              Este cobro ya fue cancelado el {formatDateTime(charge.cancelledAt)}.
            </div>
          ) : (
            <form action={handleCancel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea id="reason" name="reason" placeholder="Motivo de la cancelacion del cobro." />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline">
                  <XCircle className="h-4 w-4" />
                  Cancelar cobro
                </Button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Historial"
        title="Pagos aplicados"
        description="Cada movimiento queda asociado a este cobro."
        contentClassName="p-0"
      >
        {charge.payments.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Todavia no hay pagos registrados"
            description="Cuando registres un pago total o parcial, va a aparecer en esta lista con monto, fecha y observacion."
          />
        ) : (
          <ul className="divide-y divide-border/80">
            {charge.payments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-foreground">{payment.method ?? "Pago registrado"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Fecha: {formatDate(payment.paymentDate)}
                    </span>
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Cargado: {formatDateTime(payment.createdAt)}
                    </span>
                  </div>
                  {payment.notes ? <p className="mt-2 text-sm text-muted-foreground">{payment.notes}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-[#48745f]">{formatCurrency(payment.amount)}</p>
                  <form
                    action={async () => {
                      "use server";
                      await deletePayment(payment.id, charge.caseId, charge.id);
                    }}
                  >
                    <Button type="submit" variant="ghost" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
