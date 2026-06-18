import { getSignatureOriginalDocumentUrl, getSignatureRequest } from "@/actions/signatures";
import { SignatureEventTimeline } from "@/components/signatures/signature-event-timeline";
import { SignatureRequestActions } from "@/components/signatures/signature-request-actions";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getSignatureStatusLabel, getSignatureStatusTone } from "@/lib/signature-status";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, Briefcase, FileText, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function placementStyle(document: NonNullable<Awaited<ReturnType<typeof getSignatureRequest>>>["document"]) {
  if (!document) return undefined;
  return {
    left: `${Number(document.placementX) * 100}%`,
    top: `${Number(document.placementY) * 100}%`,
    width: `${Number(document.placementWidth) * 100}%`,
    height: `${Number(document.placementHeight) * 100}%`,
  };
}

export default async function FirmaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getSignatureRequest(id);
  if (!request) notFound();

  const documentUrl = await getSignatureOriginalDocumentUrl(id);
  const sortedEvents = [...request.events].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solicitud de firma"
        title={request.subject}
        description="Detalle operativo de la solicitud: estado, documento, destinatario y rastro de eventos."
        stats={[
          { label: "Estado", value: getSignatureStatusLabel(request.status) },
          { label: "Destinatario", value: request.recipientName ?? request.recipientEmail },
          { label: "Vence", value: formatDateTime(request.tokenExpiresAt) },
          { label: "Eventos", value: `${request.events.length}` },
        ]}
        actions={
          <>
            <StatusChip label={getSignatureStatusLabel(request.status)} tone={getSignatureStatusTone(request.status)} />
            <Button asChild variant="outline">
              <Link href="/firmas">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard
        eyebrow="Acciones"
        title="Gestion de solicitud"
        description="Las acciones disponibles cambian segun el estado actual."
      >
        <SignatureRequestActions
          requestId={request.id}
          status={request.status}
          signedDocumentAvailable={Boolean(request.document?.signedStoragePath)}
          signatureImageAvailable={Boolean(request.document?.signatureStoragePath)}
          certificateAvailable={Boolean(request.document?.signedSha256)}
        />
      </SectionCard>

      <div className="space-y-6">
        <SectionCard
          eyebrow="Documento"
          title={request.document?.originalFileName ?? "Documento pendiente"}
          description="Vista temporal del PDF original y posicion marcada para la firma."
        >
          <div className="relative mx-auto h-[min(78vh,980px)] min-h-[520px] w-full max-w-5xl overflow-hidden rounded-[28px] border border-border/80 bg-white">
            {documentUrl ? (
              <object data={documentUrl} type="application/pdf" className="h-full w-full" aria-label="PDF original">
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  No se pudo renderizar el PDF en este navegador.
                </div>
              </object>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                El documento todavia no esta disponible para previsualizar.
              </div>
            )}

            {request.document ? (
              <div
                className="pointer-events-none absolute rounded-[14px] border-2 border-[#9a4e69] bg-[#f7d6e0]/35"
                style={placementStyle(request.document)}
              >
                <span className="absolute -top-7 left-0 rounded-full bg-[#9a4e69] px-3 py-1 text-[0.68rem] font-semibold text-white">
                  Firma
                </span>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionCard
            eyebrow="Destinatario"
            title="Datos de firma"
            description="Informacion usada para el envio y la constancia."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserRound className="h-4 w-4 text-primary" />
                  {request.recipientName ?? "Nombre no informado"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{request.recipientTaxId ?? "Sin DNI/CUIT"}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  {request.recipientEmail}
                </div>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {request.client?.name ?? "Sin cliente asociado"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{request.case?.title ?? "Sin caso asociado"}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Correo" title="Mensaje enviado" description="Contenido definido al crear la solicitud.">
            <div className="space-y-3 text-sm leading-6">
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Asunto</p>
                <p className="mt-2 font-medium text-foreground">{request.subject}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mensaje</p>
                <p className="mt-2 text-muted-foreground">{request.message ?? "Sin mensaje adicional."}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        eyebrow="Seguimiento"
        title="Linea de tiempo"
        description="Registro cronologico de correo, apertura, firma y descargas."
        contentClassName="p-0"
      >
        <SignatureEventTimeline events={sortedEvents} />
      </SectionCard>
    </div>
  );
}
