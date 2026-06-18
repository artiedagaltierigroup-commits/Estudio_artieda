import { getSignatureOriginalDocumentUrl, getSignatureRequest } from "@/actions/signatures";
import { SignatureEventTimeline } from "@/components/signatures/signature-event-timeline";
import { SignatureRecipientStatusList } from "@/components/signatures/signature-recipient-status-list";
import { SignatureRequestActions } from "@/components/signatures/signature-request-actions";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getSignaturePlacementColor } from "@/lib/signature-placement-colors";
import { getSignatureStatusLabel, getSignatureStatusTone } from "@/lib/signature-status";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SignatureRequestDetail = NonNullable<Awaited<ReturnType<typeof getSignatureRequest>>>;
type SignatureRecipientDetail = SignatureRequestDetail["recipients"][number];
type SignaturePlacementDetail = SignatureRecipientDetail["placements"][number];

function getRecipientName(recipient: SignatureRecipientDetail) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

function placementStyle(placement: SignaturePlacementDetail) {
  return {
    left: `${Number(placement.placementX) * 100}%`,
    top: `${Number(placement.placementY) * 100}%`,
    width: `${Number(placement.placementWidth) * 100}%`,
    height: `${Number(placement.placementHeight) * 100}%`,
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
  const signedRecipientCount = request.recipients.filter((recipient) => recipient.status === "SIGNED").length;
  const recipientCount = request.recipients.length || 1;
  const recipientLabels = Object.fromEntries(
    request.recipients.map((recipient) => [recipient.id, getRecipientName(recipient)])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solicitud de firma"
        title={request.subject}
        description="Detalle operativo de la solicitud: estado, documento, destinatario y rastro de eventos."
        stats={[
          { label: "Estado", value: getSignatureStatusLabel(request.status) },
          { label: "Firmantes", value: `${signedRecipientCount}/${recipientCount}` },
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
          signedRecipientCount={signedRecipientCount}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Firmantes"
        title="Estado por destinatario"
        description="Seguimiento individual de envios, firmas y espacios asignados."
      >
        <SignatureRecipientStatusList requestId={request.id} recipients={request.recipients} />
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

            {request.recipients.map((recipient, recipientIndex) =>
              recipient.placements.map((placement, placementIndex) => {
                const color = getSignaturePlacementColor(recipientIndex);
                return (
                  <div
                    key={placement.id}
                    className="pointer-events-none absolute rounded-[14px] border-2"
                    style={{
                      ...placementStyle(placement),
                      borderColor: color.border,
                      backgroundColor: color.background,
                    }}
                  >
                    <span
                      className="absolute -top-7 left-0 max-w-[13rem] truncate rounded-full px-3 py-1 text-[0.68rem] font-semibold text-white"
                      style={{ backgroundColor: color.label }}
                    >
                      {getRecipientName(recipient)} #{placementIndex + 1}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
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
        <SignatureEventTimeline events={sortedEvents} recipientLabels={recipientLabels} />
      </SectionCard>
    </div>
  );
}
