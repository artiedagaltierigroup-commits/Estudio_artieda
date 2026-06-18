import { resendSignatureRecipient } from "@/actions/signatures";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getSignatureStatusTone } from "@/lib/signature-status";
import { formatDateTime } from "@/lib/utils";
import { Mail, RotateCw, UserRound } from "lucide-react";

interface SignatureRecipientStatusListProps {
  requestId: string;
  recipients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    fullName: string | null;
    email: string;
    taxId: string | null;
    status: string;
    signedAt: Date | null;
    sentAt: Date | null;
    client?: { name: string } | null;
    placements: Array<{ id: string }>;
  }>;
}

const recipientStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  READY: "Lista",
  SENT: "Enviada",
  EMAIL_OPENED: "Correo abierto",
  LINK_OPENED: "Link abierto",
  DOCUMENT_VIEWED: "Documento visto",
  SIGNING_STARTED: "Firma iniciada",
  SIGNING_INTERRUPTED: "Firma interrumpida",
  SIGNED: "Firmada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

function getRecipientName(recipient: SignatureRecipientStatusListProps["recipients"][number]) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

function canResendRecipient(status: string) {
  return !["SIGNED", "EXPIRED", "CANCELLED"].includes(status);
}

export function SignatureRecipientStatusList({ requestId, recipients }: SignatureRecipientStatusListProps) {
  async function resendRecipientAction(recipientId: string) {
    "use server";
    await resendSignatureRecipient(requestId, recipientId);
  }

  if (recipients.length === 0) {
    return <div className="text-sm text-muted-foreground">Todavia no hay destinatarios registrados.</div>;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border/70">
      <div className="divide-y divide-border/70">
        {recipients.map((recipient) => (
          <div key={recipient.id} className="grid gap-4 bg-white/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.45fr)_minmax(160px,0.35fr)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserRound className="h-4 w-4 text-primary" />
                  <span className="truncate">{getRecipientName(recipient)}</span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {recipient.email}
                </p>
              </div>
              <div className="text-xs leading-5 text-muted-foreground">
                <p>{recipient.client?.name ?? "Sin cliente asociado"}</p>
                <p>{recipient.taxId ?? "Sin DNI/CUIT"}</p>
              </div>
              <div className="text-xs leading-5 text-muted-foreground">
                <p>{recipient.placements.length} espacios</p>
                <p>{recipient.signedAt ? `Firmo ${formatDateTime(recipient.signedAt)}` : `Envio ${formatDateTime(recipient.sentAt)}`}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <StatusChip
                label={recipientStatusLabels[recipient.status] ?? recipient.status}
                tone={getSignatureStatusTone(recipient.status as Parameters<typeof getSignatureStatusTone>[0])}
              />
              {canResendRecipient(recipient.status) ? (
                <form action={resendRecipientAction.bind(null, recipient.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <RotateCw className="h-4 w-4" />
                    Reenviar
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
