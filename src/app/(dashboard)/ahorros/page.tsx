import {
  createSavingsContribution,
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoalStatus,
} from "@/actions/savings";
import { SavingsContributionForm } from "@/components/savings/savings-contribution-form";
import { SavingsGoalForm } from "@/components/savings/savings-goal-form";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { SubmitButton } from "@/components/system/submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSavingsStatusTone } from "@/lib/presentation";
import {
  filterSavingsGoalsByStatus,
  summarizeSavingsGoals,
  type SavingsGoalFilter,
} from "@/lib/savings-insights";
import { cn, formatDate, getSavingsStatusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarClock, CirclePause, CirclePlay, Flag, PiggyBank, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const filters: Array<{ value: SavingsGoalFilter; label: string }> = [
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completados" },
  { value: "PAUSED", label: "Pausados" },
  { value: "ALL", label: "Todos" },
];

interface AhorrosPageProps {
  searchParams?: Promise<{
    status?: string;
  }>;
}

function normalizeFilter(value?: string): SavingsGoalFilter {
  if (value === "COMPLETED" || value === "PAUSED" || value === "ALL") return value;
  return "IN_PROGRESS";
}

export default async function AhorrosPage({ searchParams }: AhorrosPageProps) {
  async function handleCreateGoal(formData: FormData) {
    "use server";
    const result = await createSavingsGoal(formData);
    if (result.success) redirect("/ahorros");
  }

  async function handleContribution(formData: FormData) {
    "use server";
    await createSavingsContribution(formData);
    redirect("/ahorros");
  }

  async function handleStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (id && (status === "IN_PROGRESS" || status === "PAUSED")) {
      await updateSavingsGoalStatus(id, status);
    }
    redirect("/ahorros");
  }

  const params = (await searchParams) ?? {};
  const activeFilter = normalizeFilter(params.status);
  const goals = await getSavingsGoals();
  const visibleGoals = filterSavingsGoalsByStatus(goals, activeFilter);
  const summary = summarizeSavingsGoals(goals);
  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reserva"
        title="Ahorros"
        description="Metas de dinero separadas del disponible real. Cada aporte impacta automaticamente como gasto de ahorro."
        stats={[
          { label: "Ahorrado", value: <MoneyAmount value={summary.totalSaved} /> },
          { label: "Meta total", value: <MoneyAmount value={summary.totalTarget} /> },
          { label: "Faltante", value: <MoneyAmount value={summary.totalRemaining} /> },
          { label: "Completados", value: `${summary.completedCount}` },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="En progreso"
          value={`${summary.inProgressCount}`}
          subtitle="Metas abiertas que todavia aceptan aportes."
          icon={Target}
          tone="amber"
        />
        <MetricCard
          label="Ahorrado"
          value={<MoneyAmount value={summary.totalSaved} />}
          subtitle="Total separado entre todos los ahorros."
          icon={PiggyBank}
          tone="sage"
        />
        <MetricCard
          label="Falta"
          value={<MoneyAmount value={summary.totalRemaining} />}
          subtitle="Diferencia entre metas y dinero ya aportado."
          icon={Flag}
          tone="rose"
        />
        <MetricCard
          label="Pausados"
          value={`${summary.pausedCount}`}
          subtitle="Metas detenidas temporalmente."
          icon={CirclePause}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <SectionCard
          eyebrow="Panel"
          title="Metas de ahorro"
          description="Los filtros quedan en la URL, asi el navegador recuerda rapidamente la vista que estabas usando."
          actions={
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.value;
                const href = filter.value === "IN_PROGRESS" ? "/ahorros" : `/ahorros?status=${filter.value}`;

                return (
                  <Button key={filter.value} asChild variant={isActive ? "default" : "outline"} size="sm">
                    <Link href={href}>{filter.label}</Link>
                  </Button>
                );
              })}
            </div>
          }
          contentClassName="space-y-4"
        >
          {visibleGoals.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No hay ahorros para esta vista"
              description="Crea una meta nueva o cambia el filtro para ver ahorros pausados, completados o todos."
            />
          ) : (
            visibleGoals.map((goal) => {
              const derivedStatus = goal.derivedStatus;
              const progress = Math.round(goal.progressPercentage);
              const canContribute = derivedStatus === "IN_PROGRESS";
              const isPaused = derivedStatus === "PAUSED";

              return (
                <Card key={goal.id} className="overflow-hidden">
                  <div className="space-y-5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip
                            label={getSavingsStatusLabel(derivedStatus)}
                            tone={getSavingsStatusTone(derivedStatus)}
                          />
                          {goal.deadline ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatDate(goal.deadline)}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold tracking-tight text-foreground">{goal.name}</h2>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {goal.description ?? "Sin descripcion cargada."}
                          </p>
                        </div>
                      </div>

                      {derivedStatus !== "COMPLETED" ? (
                        <form action={handleStatus}>
                          <input type="hidden" name="id" value={goal.id} />
                          <input type="hidden" name="status" value={isPaused ? "IN_PROGRESS" : "PAUSED"} />
                          <SubmitButton variant="outline" size="sm" pendingLabel={isPaused ? "Reactivando..." : "Pausando..."}>
                            {isPaused ? <CirclePlay className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}
                            {isPaused ? "Reactivar" : "Pausar"}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[22px] border border-border/70 bg-white/85 p-4">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Ahorrado
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#466a58]">
                          <MoneyAmount value={goal.savedAmount} />
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-border/70 bg-white/85 p-4">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Meta
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          <MoneyAmount value={goal.targetAmount} />
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-border/70 bg-white/85 p-4">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Faltante
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#8f3d58]">
                          <MoneyAmount value={goal.remainingAmount} />
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-[#edf3ef]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            derivedStatus === "COMPLETED" ? "bg-[#7bbe9e]" : "bg-[#c57a60]"
                          )}
                          style={{ width: `${goal.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {canContribute ? (
                      <SavingsContributionForm
                        action={handleContribution}
                        savingsGoalId={goal.id}
                        defaultDate={todayKey}
                      />
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
                        {derivedStatus === "COMPLETED"
                          ? "Meta completada. Los nuevos aportes quedan bloqueados para mantener el cierre claro."
                          : "Ahorro pausado. Reactivalo para volver a registrar aportes."}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </SectionCard>

        <SavingsGoalForm action={handleCreateGoal} />
      </div>
    </div>
  );
}
