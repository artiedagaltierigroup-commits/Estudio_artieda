import { getClient } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { summarizeClientCases } from "@/lib/detail-summaries";
import { getCaseStatusTone, getNameInitials } from "@/lib/presentation";
import { formatDate, getCaseStatusLabel } from "@/lib/utils";
import { ArrowLeft, Briefcase, FileText, Mail, MapPin, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const caseSummary = summarizeClientCases(client.cases);
  const contactItems = [
    { label: "Email", value: client.email, icon: Mail },
    { label: "Telefono", value: client.phone, icon: Phone },
    { label: "Direccion", value: client.address, icon: MapPin },
    { label: "Identificacion", value: client.taxId, icon: FileText },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ficha del cliente"
        title={client.name}
        description={
          client.taxId
            ? `Identificacion principal ${client.taxId}. Este espacio ya queda preparado para deuda, historial y proximos vencimientos.`
            : "Perfil base del cliente. Desde aca despues vamos a abrir historial, deuda y recordatorios relacionados."
        }
        stats={[
          { label: "Casos totales", value: `${caseSummary.total}` },
          { label: "Activos", value: `${caseSummary.active}` },
          { label: "Suspendidos", value: `${caseSummary.suspended}` },
          { label: "Cerrados", value: `${caseSummary.closed}` },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clientes">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/casos/nuevo?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                Nuevo caso
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          eyebrow="Contacto"
          title="Ficha base"
          description="Datos primarios del cliente para iniciar gestion, seguimiento y futura trazabilidad."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.18))] p-5 sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/12 text-lg font-semibold text-[#8f4e68]">
                  {getNameInitials(client.name)}
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.taxId ?? "Sin identificacion fiscal cargada"}
                  </p>
                </div>
              </div>
            </div>

            {contactItems.length > 0 ? (
              contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-[24px] border border-border/70 bg-white/80 p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">{item.label}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.value}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Aun no hay datos de contacto complementarios cargados para este cliente.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Notas"
          title="Observaciones internas"
          description="Espacio reservado para contexto util del vinculo profesional."
        >
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-5">
            <p className="text-sm leading-7 text-foreground">
              {client.notes ?? "Todavia no hay notas internas para este cliente."}
            </p>
          </div>
        </SectionCard>
      </div>

      {client.cases.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Todavia no hay casos asociados"
          description="El siguiente paso natural es abrir el primer caso desde este cliente para que la operacion quede conectada."
          action={
            <Button asChild>
              <Link href={`/casos/nuevo?clientId=${client.id}`}>
                <Plus className="h-4 w-4" />
                Crear caso
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          eyebrow="Relacion activa"
          title="Casos asociados"
          description="Listado base con acceso rapido al expediente y su estado actual."
          contentClassName="p-0"
        >
          <ul className="divide-y divide-border/80">
            {client.cases.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/casos/${item.id}`}
                  className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-muted/25 md:flex-row md:items-center md:justify-between"
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
                        Inicio: {formatDate(item.startDate)}
                      </span>
                      <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                        Actualizado: {formatDate(item.updatedAt?.toISOString?.() ?? String(item.updatedAt))}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Abrir expediente</span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
