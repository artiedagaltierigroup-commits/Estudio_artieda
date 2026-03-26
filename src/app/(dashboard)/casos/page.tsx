import { getCases } from "@/actions/cases";
import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCaseStatusTone, getChargeStatusTone } from "@/lib/presentation";
import {
  formatCurrency,
  formatDate,
  getCaseStatusLabel,
  getChargeStatusLabel,
  getPriorityLabel,
} from "@/lib/utils";
import { AlarmClockCheck, Briefcase, ChevronRight, Coins, Plus, Search, WalletCards } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function getPriorityTone(priority: string) {
  switch (priority) {
    case "HIGH":
      return "danger" as const;
    case "MEDIUM":
      return "amber" as const;
    case "LOW":
    default:
      return "slate" as const;
  }
}

interface CasosPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    chargeStatus?: string;
  }>;
}

export default async function CasosPage({ searchParams }: CasosPageProps) {
  const params = (await searchParams) ?? {};
  const filters = {
    query: params.q?.trim() ?? "",
    status: params.status?.trim() ?? "",
    chargeStatus: params.chargeStatus?.trim() ?? "",
  };

  const [caseList, clientList] = await Promise.all([
    getCases(filters),
    getClients(),
  ]);

  const activeCases = caseList.filter((item) => item.status === "ACTIVE").length;
  const overdueCases = caseList.filter((item) => item.financeSummary.overdue > 0).length;
  const totalFees = caseList.reduce((sum, item) => sum + Number(item.fee ?? 0), 0);
  const openBalance = caseList.reduce((sum, item) => sum + item.pendingBalance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline juridico"
        title="Casos"
        description="Bandeja operativa de expedientes con lectura financiera, prioridad y proximos vencimientos."
        stats={[
          { label: "Visibles", value: `${caseList.length}` },
          { label: "Activos", value: `${activeCases}` },
          { label: "Con atraso", value: `${overdueCases}` },
          { label: "Saldo abierto", value: formatCurrency(openBalance) },
        ]}
        actions={
          <Button asChild>
            <Link href="/casos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo caso
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Honorarios pactados"
          value={formatCurrency(totalFees)}
          subtitle="Monto base definido en los expedientes visibles."
          icon={WalletCards}
          tone="rose"
        />
        <MetricCard
          label="Cobrado"
          value={formatCurrency(caseList.reduce((sum, item) => sum + item.financeSummary.collected, 0))}
          subtitle="Pagos ya registrados sobre esos casos."
          icon={Coins}
          tone="sage"
        />
        <MetricCard
          label="Saldo pendiente"
          value={formatCurrency(openBalance)}
          subtitle="Deuda viva todavia no recuperada."
          icon={Briefcase}
          tone="amber"
        />
        <MetricCard
          label="Expedientes vencidos"
          value={`${overdueCases}`}
          subtitle="Casos con al menos un cobro vencido."
          icon={AlarmClockCheck}
          tone="danger"
        />
      </div>

      <SectionCard
        eyebrow="Vista operativa"
        title="Listado de casos"
        description="Busqueda simple y filtros de lectura real para gestionar el estudio sin entrar expediente por expediente."
      >
        <form className="grid gap-3 border-b border-border/80 pb-5 lg:grid-cols-[minmax(0,1.2fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={filters.query}
              placeholder="Buscar por caso o cliente"
              className="pl-10"
            />
          </div>

          <select name="status" defaultValue={filters.status || ""} className={selectClassName}>
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
            <option value="CLOSED">Cerrados</option>
          </select>

          <select name="chargeStatus" defaultValue={filters.chargeStatus || ""} className={selectClassName}>
            <option value="">Todos los cobros</option>
            <option value="PENDING">Pendientes</option>
            <option value="PARTIAL">Parciales</option>
            <option value="OVERDUE">Vencidos</option>
            <option value="PAID">Pagados</option>
          </select>

          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {filters.query || filters.status || filters.chargeStatus ? (
              <Button asChild variant="ghost">
                <Link href="/casos">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {caseList.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              icon={Briefcase}
              title={clientList.length === 0 ? "Todavia no hay casos ni clientes" : "No hay casos para esos filtros"}
              description={
                clientList.length === 0
                  ? "Puedes crear el primer caso y tambien el primer cliente en el mismo formulario."
                  : "Ajusta los filtros o crea un nuevo expediente para volver a poblar la bandeja."
              }
              action={
                <Button asChild>
                  <Link href="/casos/nuevo">
                    <Plus className="h-4 w-4" />
                    Crear caso
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto pt-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35">
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Caso
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cliente
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Pactado
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cobrado
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Saldo
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Vencimiento
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {caseList.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <div className="flex flex-wrap gap-2">
                          <StatusChip
                            label={getCaseStatusLabel(item.status)}
                            tone={getCaseStatusTone(item.status)}
                          />
                          <StatusChip
                            label={`Prioridad ${getPriorityLabel(item.priority).toLowerCase()}`}
                            tone={getPriorityTone(item.priority)}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      <p className="font-medium text-foreground">{item.client?.name ?? "Sin cliente"}</p>
                      <p className="mt-1 text-xs">Inicio: {formatDate(item.startDate)}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <StatusChip
                          label={getChargeStatusLabel(item.financeSummary.dominantStatus)}
                          tone={getChargeStatusTone(item.financeSummary.dominantStatus)}
                        />
                        <p className="text-xs text-muted-foreground">{item.financeSummary.openCharges} cobro(s) abiertos</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-foreground">
                      {item.fee ? formatCurrency(item.fee) : "Sin definir"}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-[#48745f]">
                      {formatCurrency(item.financeSummary.collected)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-foreground">
                      {formatCurrency(item.pendingBalance)}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {item.latestDueDate ? formatDate(item.latestDueDate) : "Sin vencimientos"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/casos/${item.id}`}>
                          Ver expediente
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
