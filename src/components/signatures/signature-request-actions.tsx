import {
  cancelSignatureRequest,
  resendSignatureRequest,
  sendSignatureRequest,
} from "@/actions/signatures";
import { Button } from "@/components/ui/button";
import { Ban, Copy, Download, RotateCw, Send } from "lucide-react";

interface SignatureRequestActionsProps {
  requestId: string;
  status: string;
}

function canSend(status: string) {
  return status === "DRAFT" || status === "READY";
}

function canResend(status: string) {
  return [
    "SENT",
    "EMAIL_OPENED",
    "LINK_OPENED",
    "DOCUMENT_VIEWED",
    "SIGNING_STARTED",
    "SIGNING_INTERRUPTED",
  ].includes(status);
}

function canCancel(status: string) {
  return !["SIGNED", "CANCELLED", "REJECTED", "EXPIRED"].includes(status);
}

export function SignatureRequestActions({ requestId, status }: SignatureRequestActionsProps) {
  async function sendAction() {
    "use server";
    await sendSignatureRequest(requestId);
  }

  async function resendAction() {
    "use server";
    await resendSignatureRequest(requestId);
  }

  async function cancelAction() {
    "use server";
    await cancelSignatureRequest(requestId);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canSend(status) ? (
        <form action={sendAction}>
          <Button type="submit">
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </form>
      ) : null}

      {canResend(status) ? (
        <form action={resendAction}>
          <Button type="submit" variant="outline">
            <RotateCw className="h-4 w-4" />
            Reenviar
          </Button>
        </form>
      ) : null}

      {status === "SIGNED" ? (
        <>
          <Button asChild variant="outline">
            <a href={`/api/signatures/${requestId}/signed-document`}>
              <Download className="h-4 w-4" />
              PDF firmado
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/signatures/${requestId}/signature-image`}>
              <Download className="h-4 w-4" />
              Firma
            </a>
          </Button>
        </>
      ) : null}

      {canResend(status) || canSend(status) ? (
        <Button type="button" variant="ghost" disabled title="Disponible despues del envio real de correo">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
      ) : null}

      {canCancel(status) ? (
        <form action={cancelAction}>
          <Button type="submit" variant="outline">
            <Ban className="h-4 w-4" />
            Cancelar
          </Button>
        </form>
      ) : null}
    </div>
  );
}
