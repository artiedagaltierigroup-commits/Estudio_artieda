import { getSignatureRequests } from "@/actions/signatures";
import { SignatureFilters } from "@/components/signatures/signature-filters";
import { SignatureRequestList } from "@/components/signatures/signature-request-list";
import { MetricCard } from "@/components/system/metric-card";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { AlarmClockCheck, CheckCircle2, Clock3, FileSignature, Plus } from "lucide-react";
import Link from "next/link";

interface FirmasPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    sort?: "recent" | "oldest" | "status" | "recipient";
  }>;
}

const activeStatuses = new Set([
  "READY",
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "DOCUMENT_VIEWED",
  "SIGNING_STARTED",
  "SIGNING_INTERRUPTED",
]);

export default async function FirmasPage({ searchParams }: FirmasPageProps) {
  const params = (await searchParams) ?? {};
  const filters = {
    query: params.q?.trim() ?? "",
    status: params.status?.trim() ?? "",
    sort: params.sort ?? "recent",
  };

  const requests = await getSignatureRequests(filters);
  const signed = requests.filter((request) => request.status === "SIGNED").length;
  const expired = requests.filter((request) => request.status === "EXPIRED").length;
  const pending = requests.filter((request) => activeStatuses.has(request.status)).length;
  const interrupted = requests.filter((request) => request.status === "SIGNING_INTERRUPTED").length;
  const hasFilters = Boolean(filters.query || filters.status || filters.sort !== "recent");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centro de firmas"
        title="Solicitudes de firma"
        description="Bandeja operativa para subir PDFs, enviar solicitudes, seguir aperturas y descargar documentos firmados."
        stats={[
          { label: "Visibles", value: `${requests.length}` },
          { label: "Pendientes", value: `${pending}` },
          { label: "Firmadas", value: `${signed}` },
          { label: "Vencidas", value: `${expired}` },
        ]}
        actions={
          <Button asChild>
            <Link href="/firmas/nueva">
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="En seguimiento"
          value={`${pending}`}
          subtitle="Solicitudes enviadas o listas para accionar."
          icon={Clock3}
          tone="amber"
        />
        <MetricCard
          label="Firmadas"
          value={`${signed}`}
          subtitle="Documentos completados y disponibles para descarga."
          icon={CheckCircle2}
          tone="sage"
        />
        <MetricCard
          label="Interrumpidas"
          value={`${interrupted}`}
          subtitle="Firmantes que iniciaron el flujo y no finalizaron."
          icon={AlarmClockCheck}
          tone={interrupted > 0 ? "danger" : "slate"}
        />
        <MetricCard
          label="Total visible"
          value={`${requests.length}`}
          subtitle="Resultado actual de filtros y orden aplicado."
          icon={FileSignature}
          tone="lilac"
        />
      </div>

      <SectionCard
        eyebrow="Vista operativa"
        title="Solicitudes creadas"
        description="Busca por asunto o destinatario, filtra por estado y entra al detalle para reenviar, cancelar o descargar."
      >
        <SignatureFilters query={filters.query} status={filters.status} sort={filters.sort} />
        <SignatureRequestList requests={requests} hasFilters={hasFilters} />
      </SectionCard>
    </div>
  );
}
