import { getClients } from "@/actions/clients";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { getNameInitials } from "@/lib/presentation";
import { ChevronRight, FileText, Mail, Phone, Plus, Users } from "lucide-react";
import Link from "next/link";

export default async function ClientesPage() {
  const clientList = await getClients();
  const withEmail = clientList.filter((client) => Boolean(client.email)).length;
  const withPhone = clientList.filter((client) => Boolean(client.phone)).length;
  const withNotes = clientList.filter((client) => Boolean(client.notes)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base comercial"
        title="Clientes"
        description="El directorio central del estudio. Desde aca despues vamos a abrir historial, deuda, casos y proximos seguimientos."
        stats={[
          { label: "Total", value: `${clientList.length} registros` },
          { label: "Con email", value: `${withEmail}` },
          { label: "Con telefono", value: `${withPhone}` },
          { label: "Con notas", value: `${withNotes}` },
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

      {clientList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavia no hay clientes cargados"
          description="Crea el primer cliente para empezar a ordenar casos, cobros y recordatorios desde una sola base."
          action={
            <Button asChild>
              <Link href="/clientes/nuevo">
                <Plus className="h-4 w-4" />
                Crear primer cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          eyebrow="Listado base"
          title="Agenda de clientes"
          description="Vista inicial para lectura rapida. Los totales financieros y filtros avanzados quedan listos para la fase funcional del modulo."
          contentClassName="p-0"
        >
          <ul className="divide-y divide-border/80">
            {clientList.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clientes/${client.id}`}
                  className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[20px] bg-primary/12 text-sm font-semibold text-[#8f4e68]">
                      {getNameInitials(client.name)}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                          {client.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {client.taxId ? `Identificacion: ${client.taxId}` : "Sin identificacion fiscal cargada"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {client.email ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            {client.email}
                          </span>
                        ) : null}
                        {client.phone ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            {client.phone}
                          </span>
                        ) : null}
                        {client.notes ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Con notas internas
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border/80 bg-background px-3 py-1">
                      Ver detalle
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
