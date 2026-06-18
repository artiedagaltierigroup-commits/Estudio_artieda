import type { getSignatureRequests } from "@/actions/signatures";
import { EmptyState } from "@/components/system/empty-state";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getSignatureStatusLabel, getSignatureStatusTone } from "@/lib/signature-status";
import { formatDateTime } from "@/lib/utils";
import { Download, Eye, FileSignature, RotateCw } from "lucide-react";
import Link from "next/link";

type SignatureRequestListItem = Awaited<ReturnType<typeof getSignatureRequests>>[number];

interface SignatureRequestListProps {
  requests: SignatureRequestListItem[];
  hasFilters: boolean;
}

function getAssociationLabel(request: SignatureRequestListItem) {
  if (request.case?.title && request.client?.name) return `${request.client.name} / ${request.case.title}`;
  if (request.case?.title) return request.case.title;
  if (request.client?.name) return request.client.name;
  return "Sin cliente ni caso asociado";
}

function canResend(status: string) {
  return [
    "SENT",
    "EMAIL_OPENED",
    "LINK_OPENED",
    "DOCUMENT_VIEWED",
    "SIGNING_STARTED",
    "SIGNING_INTERRUPTED",
    "PARTIALLY_SIGNED",
  ].includes(status);
}

function getRecipientProgress(request: SignatureRequestListItem) {
  const total = request.recipients.length || 1;
  const signed = request.recipients.filter((recipient) => recipient.status === "SIGNED").length;
  return { signed, total };
}

export function SignatureRequestList({ requests, hasFilters }: SignatureRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={FileSignature}
          title={hasFilters ? "No hay solicitudes con esos filtros" : "Todavia no hay solicitudes de firma"}
          description={
            hasFilters
              ? "Proba con otro destinatario, estado u orden para volver a encontrar la solicitud."
              : "Crea la primera solicitud para subir un PDF, ubicar la firma y enviarlo por correo."
          }
          action={
            !hasFilters ? (
              <Button asChild>
                <Link href="/firmas/nueva">
                  <FileSignature className="h-4 w-4" />
                  Nueva solicitud
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pt-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border/80 bg-muted/35">
            <th className="px-5 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Solicitud
            </th>
            <th className="px-5 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Asociacion
            </th>
            <th className="px-5 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Estado
            </th>
            <th className="px-5 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Ultima actividad
            </th>
            <th className="px-5 py-4 text-right text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/80">
          {requests.map((request) => (
            <tr key={request.id} className="transition-colors hover:bg-muted/25">
              <td className="px-5 py-4 align-top">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{request.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRecipientProgress(request).signed}/{getRecipientProgress(request).total} firmantes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Creada: {formatDateTime(request.createdAt)}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 align-top text-xs text-muted-foreground">
                <p className="max-w-xs leading-5">{getAssociationLabel(request)}</p>
                <p className="mt-1">
                  {request.document?.originalFileName ?? "Documento pendiente"}
                </p>
              </td>
              <td className="px-5 py-4 align-top">
                <StatusChip
                  label={getSignatureStatusLabel(request.status)}
                  tone={getSignatureStatusTone(request.status)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {getRecipientProgress(request).signed} de {getRecipientProgress(request).total} completaron
                </p>
              </td>
              <td className="px-5 py-4 align-top text-xs text-muted-foreground">
                {request.latestEvent ? (
                  <>
                    <p className="font-medium text-foreground">{request.latestEvent.type}</p>
                    <p className="mt-1">{formatDateTime(request.latestEvent.createdAt)}</p>
                  </>
                ) : (
                  "Sin eventos"
                )}
              </td>
              <td className="px-5 py-4 align-top">
                <div className="flex justify-end gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/firmas/${request.id}`}>
                      <Eye className="h-4 w-4" />
                      Ver
                    </Link>
                  </Button>
                  {canResend(request.status) ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/firmas/${request.id}`}>
                        <RotateCw className="h-4 w-4" />
                        Reenviar
                      </Link>
                    </Button>
                  ) : null}
                  {request.status === "SIGNED" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/firmas/${request.id}`}>
                        <Download className="h-4 w-4" />
                        Descargar
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
