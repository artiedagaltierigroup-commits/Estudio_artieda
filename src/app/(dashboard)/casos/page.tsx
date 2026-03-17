import { getCases } from "@/actions/cases";
import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getCaseStatusTone } from "@/lib/presentation";
import { formatCurrency, formatDate, getCaseStatusLabel } from "@/lib/utils";
import { Briefcase, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

export default async function CasosPage() {
  const [caseList, clientList] = await Promise.all([getCases(), getClients()]);
  const activeCases = caseList.filter((item) => item.status === "ACTIVE").length;
  const suspendedCases = caseList.filter((item) => item.status === "SUSPENDED").length;
  const closedCases = caseList.filter((item) => item.status === "CLOSED").length;
  const totalFees = caseList.reduce((sum, item) => sum + Number(item.fee ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline juridico"
        title="Casos"
        description="Vista general para controlar avance, cliente asociado y honorarios base antes de entrar al detalle del expediente."
        stats={[
          { label: "Total", value: `${caseList.length} casos` },
          { label: "Activos", value: `${activeCases}` },
          { label: "Suspendidos", value: `${suspendedCases}` },
          { label: "Honorarios pactados", value: formatCurrency(totalFees) },
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

      {caseList.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Todavia no hay casos cargados"
          description={
            clientList.length === 0
              ? "Antes de abrir casos conviene crear al menos un cliente para mantener la relacion ordenada."
              : "Ya tenes clientes disponibles. El siguiente paso es abrir el primer caso y empezar a registrar cobros."
          }
          action={
            <Button asChild>
              <Link href="/casos/nuevo">
                <Plus className="h-4 w-4" />
                Crear primer caso
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          eyebrow="Vista base"
          title="Listado de casos"
          description={`${
            closedCases > 0 ? `${closedCases} cerrados` : "Sin cierres todavia"
          } y ${activeCases} activos en este momento.`}
          contentClassName="p-0"
        >
          <ul className="divide-y divide-border/80">
            {caseList.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/casos/${item.id}`}
                  className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{item.title}</p>
                      <StatusChip
                        label={getCaseStatusLabel(item.status)}
                        tone={getCaseStatusTone(item.status)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Cliente: {item.client?.name ?? "Sin cliente"}
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Inicio: {formatDate(item.startDate)}
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Honorarios: {item.fee ? formatCurrency(item.fee) : "Sin definir"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Abrir caso
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
