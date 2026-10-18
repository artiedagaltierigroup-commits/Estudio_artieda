import { getSignatureOriginalDocumentUrl, getSignatureRequest } from "@/actions/signatures";
import { SignatureEventTimeline } from "@/components/signatures/signature-event-timeline";
import { SignatureDocumentPreview } from "@/components/signatures/signature-document-preview";
import { SignatureRecipientStatusList } from "@/components/signatures/signature-recipient-status-list";
import { SignatureRequestActions } from "@/components/signatures/signature-request-actions";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getSignatureStatusLabel, getSignatureStatusTone } from "@/lib/signature-status";
import { formatDateTime } from "@/lib/utils";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SignatureRequestDetail = NonNullable<Awaited<ReturnType<typeof getSignatureRequest>>>;
type SignatureRecipientDetail = SignatureRequestDetail["recipients"][number];

function getRecipientName(recipient: SignatureRecipientDetail) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

export default async function FirmaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getWorkspaceAccess();
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
          canDelete={access.role === "ADMIN"}
        />
        {request.status === "SIGNED" && request.sendSignedCopyToRecipients && !request.signedCopySentAt ? (
          <p role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            La copia por correo sigue pendiente. El PDF firmado esta guardado y podes descargarlo para compartirlo.
          </p>
        ) : null}
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
          description="PDF original y espacios de firma tal como se ubicaron al crear la solicitud."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(320px,1.15fr)]">
            <div className="rounded-[24px] border border-border/70 bg-white/85 p-5 text-sm leading-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Archivo original</p>
              <p className="mt-2 break-words font-medium text-foreground">
                {request.document?.originalFileName ?? "Documento pendiente"}
              </p>
              <p className="mt-3 text-muted-foreground">
                Esta vista muestra los espacios guardados para cada firmante. Podes recorrer las paginas sin modificar la solicitud.
              </p>
            </div>
            {documentUrl ? (
              <SignatureDocumentPreview
                key={request.id}
                previewUrl={documentUrl}
                recipients={request.recipients.map((recipient) => ({
                  id: recipient.id,
                  label: getRecipientName(recipient),
                }))}
                placements={request.recipients.flatMap((recipient) =>
                  recipient.placements.map((placement) => ({
                    id: placement.id,
                    recipientId: recipient.id,
                    pageNumber: placement.pageNumber,
                    x: Number(placement.placementX),
                    y: Number(placement.placementY),
                    width: Number(placement.placementWidth),
                    height: Number(placement.placementHeight),
                  }))
                )}
              />
            ) : (
              <div className="flex min-h-[28rem] items-center justify-center rounded-[28px] border border-border/80 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                El documento todavia no esta disponible para previsualizar.
              </div>
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
