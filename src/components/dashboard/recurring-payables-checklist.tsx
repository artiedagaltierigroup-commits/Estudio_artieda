import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MoneyAmount } from "@/components/system/money-amount";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getReminderPriorityTone } from "@/lib/module-presenters";
import { getReminderWindowStart } from "@/lib/recurring-expense-occurrences";
import { formatDate, getPriorityLabel } from "@/lib/utils";
import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import Link from "next/link";

interface ChecklistItem {
  occurrenceId: string;
  recurringId: string;
  description: string;
  amount: string | number;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  notifyDaysBefore: number;
  status: "PENDING" | "PAID" | "OVERDUE";
}

interface RecurringPayablesChecklistProps {
  pending: ChecklistItem[];
  paid: ChecklistItem[];
  onMarkPaid: (formData: FormData) => void | Promise<void>;
  onReopen: (formData: FormData) => void | Promise<void>;
}

function ChecklistProgress({ dueDate, notifyDaysBefore }: { dueDate: string; notifyDaysBefore: number }) {
  const today = new Date();
  const visibleFrom = parseISO(getReminderWindowStart(dueDate, notifyDaysBefore));
  const due = parseISO(dueDate);
  const totalDays = Math.max(1, differenceInCalendarDays(due, visibleFrom));
  const elapsedDays = Math.min(Math.max(0, differenceInCalendarDays(today, visibleFrom)), totalDays);
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[0.72rem] text-muted-foreground">
        <span>{formatDistanceToNowStrict(due, { locale: es, addSuffix: true })}</span>
        <span>Vence {formatDate(dueDate)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            differenceInCalendarDays(due, today) < 0 ? "bg-rose-500" : "bg-amber-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ChecklistCard({
  item,
  action,
  done,
}: {
  item: ChecklistItem;
  action: (formData: FormData) => void | Promise<void>;
  done: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-white/90 p-4">
      <div className="flex items-start gap-3">
        <form action={action} className="pt-1">
          <input type="hidden" name="occurrenceId" value={item.occurrenceId} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-full border ${done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border"}`}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </Button>
        </form>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold text-foreground ${done ? "line-through opacity-70" : ""}`}>{item.description}</p>
            <StatusChip label={getPriorityLabel(item.priority)} tone={getReminderPriorityTone(item.priority)} />
            <StatusChip label={item.status === "OVERDUE" ? "Vencido" : done ? "Pagado" : "Pendiente"} tone={done ? "sage" : item.status === "OVERDUE" ? "danger" : "amber"} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/80 bg-background px-3 py-1">
              <MoneyAmount value={item.amount} />
            </span>
            <span className="rounded-full border border-border/80 bg-background px-3 py-1">
              Avisa {item.notifyDaysBefore} dia(s) antes
            </span>
          </div>

          {!done ? <ChecklistProgress dueDate={item.dueDate} notifyDaysBefore={item.notifyDaysBefore} /> : null}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link href={`/gastos/recurrentes/${item.recurringId}/editar`} className="text-[#9a4e69] underline-offset-4 hover:underline">
              Editar recurrente
            </Link>
            {done ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Desmarcar lo devuelve a pendientes
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecurringPayablesChecklist({
  pending,
  paid,
  onMarkPaid,
  onReopen,
}: RecurringPayablesChecklistProps) {
  return (
    <SectionCard
      eyebrow="Checklist financiero"
      title="Gastos por pagar"
      description="Control visual de gastos recurrentes que todavia no impactaron como gasto real hasta que los marques pagados."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Pendientes y vencidos</p>
            <p className="text-xs text-muted-foreground">{pending.length} item(s)</p>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
              No hay gastos por pagar visibles en esta ventana.
            </div>
          ) : (
            pending.map((item) => <ChecklistCard key={item.occurrenceId} item={item} action={onMarkPaid} done={false} />)
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Pagados</p>
            <p className="text-xs text-muted-foreground">{paid.length} item(s)</p>
          </div>
          {paid.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
              Lo que marques pagado aparece aca aunque se haya pagado antes del vencimiento.
            </div>
          ) : (
            paid.map((item) => <ChecklistCard key={item.occurrenceId} item={item} action={onReopen} done />)
          )}
        </div>
      </div>
    </SectionCard>
  );
}
