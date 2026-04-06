import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { MetricCard } from "@/components/system/metric-card";
import { MoneyAmount } from "@/components/system/money-amount";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getClientPortfolioStatusLabel,
  getClientPortfolioStatusTone,
} from "@/lib/module-presenters";
import { getNameInitials } from "@/lib/presentation";
import { formatDateTime } from "@/lib/utils";
import { Briefcase, ChevronRight, Coins, Plus, Search, Users } from "lucide-react";
import Link from "next/link";

interface ClientesPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const clientList = await getClients(query);

  const overdueClients = clientList.filter((client) => client.portfolioStatus === "OVERDUE").length;
  const activeClients = clientList.filter((client) => client.caseSummary.active > 0).length;
  const openBalance = clientList.reduce((sum, client) => sum + client.financeSummary.balance, 0);
  const totalCollected = clientList.reduce((sum, client) => sum + client.financeSummary.collected, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base comercial"
        title="Clientes"
        description="Directorio operativo del estudio. Desde aca ya podras leer deuda, casos, actividad reciente y proximos seguimientos sin salir del modulo."
        stats={[
          { label: "Total", value: `${clientList.length} visibles` },
          { label: "Con deuda vencida", value: `${overdueClients}` },
          { label: "Activos", value: `${activeClients}` },
          { label: "Saldo abierto", value: <MoneyAmount value={openBalance} /> },
        ]}
        actions={
          <Button asChild>
            <Link href="/clientes/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cobrado historico"
          value={<MoneyAmount value={totalCollected} />}
          subtitle="Pagos registrados entre todos los clientes."
          icon={Coins}
          tone="sage"
        />
        <MetricCard
          label="Deuda pendiente"
          value={<MoneyAmount value={openBalance} />}
          subtitle="Saldo vivo todavia no cobrado."
          icon={Users}
          tone="amber"
        />
        <MetricCard
          label="Clientes activos"
          value={`${activeClients}`}
          subtitle="Clientes con al menos un caso en curso."
          icon={Briefcase}
          tone="lilac"
        />
        <MetricCard
          label="Seguimiento urgente"
          value={`${overdueClients}`}
          subtitle="Clientes con deuda ya vencida."
          icon={Search}
          tone="danger"
        />
      </div>

      <SectionCard
        eyebrow="Vista operativa"
        title="Agenda de clientes"
        description="Busqueda simple por nombre, email, telefono o identificacion. La lista ya prioriza lectura comercial y financiera."
      >
        <form className="flex flex-col gap-3 border-b border-border/80 pb-5 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, email, telefono o identificacion"
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Buscar
            </Button>
            {query ? (
              <Button asChild variant="ghost">
                <Link href="/clientes">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {clientList.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              icon={Users}
              title={query ? "No encontramos clientes con ese criterio" : "Todavia no hay clientes cargados"}
              description={
                query
                  ? "Proba con otro dato de contacto o limpia la busqueda para volver a ver todo el directorio."
                  : "Crea el primer cliente para empezar a ordenar casos, cobros y recordatorios desde una sola base."
              }
              action={
                !query ? (
                  <Button asChild>
                    <Link href="/clientes/nuevo">
                      <Plus className="h-4 w-4" />
                      Crear primer cliente
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto pt-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35">
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cliente
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Contacto
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cobrado
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Deuda
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Casos
                  </th>
                  <th className="px-4 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Ultimo movimiento
                  </th>
                  <th className="px-4 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {clientList.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-primary/12 text-sm font-semibold text-[#8f4e68]">
                          {getNameInitials(client.name)}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.taxId ? `Identificacion: ${client.taxId}` : "Sin identificacion fiscal"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                      <p>{client.phone ?? "Sin telefono"}</p>
                      <p className="mt-1">{client.email ?? "Sin email"}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <StatusChip
                          label={getClientPortfolioStatusLabel(client.portfolioStatus)}
                          tone={getClientPortfolioStatusTone(client.portfolioStatus)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {client.financeSummary.openReminders} recordatorio(s) abierto(s)
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-[#48745f]">
                      <MoneyAmount value={client.financeSummary.collected} />
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-foreground">
                      <MoneyAmount value={client.financeSummary.balance} />
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      <span className="font-medium text-foreground">{client.caseSummary.total}</span>
                      <span className="block text-xs">activos {client.caseSummary.active}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {client.financeSummary.lastMovementAt
                        ? formatDateTime(client.financeSummary.lastMovementAt)
                        : "Sin movimientos recientes"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clientes/${client.id}`}>
                          Ver detalle
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
