import {
  cancelSignatureRequest,
  deleteSignatureRequest,
  resendSignatureRequest,
  sendSignatureRequest,
} from "@/actions/signatures";
import { SignatureActionForm } from "@/components/signatures/signature-action-form";
import { Button } from "@/components/ui/button";
import { Ban, Download, RotateCw, Send, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";

interface SignatureRequestActionsProps {
  requestId: string;
  status: string;
  signedDocumentAvailable?: boolean;
  signatureImageAvailable?: boolean;
  certificateAvailable?: boolean;
  signedRecipientCount?: number;
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
    "PARTIALLY_SIGNED",
  ].includes(status);
}

function canCancel(status: string) {
  return !["SIGNED", "CANCELLED", "REJECTED", "EXPIRED"].includes(status);
}

export function SignatureRequestActions({
  requestId,
  status,
  signedDocumentAvailable = false,
  signatureImageAvailable = false,
  certificateAvailable = false,
  signedRecipientCount = 0,
}: SignatureRequestActionsProps) {
  async function sendAction() {
    "use server";
    return sendSignatureRequest(requestId);
  }

  async function resendAction() {
    "use server";
    return resendSignatureRequest(requestId);
  }

  async function cancelAction() {
    "use server";
    await cancelSignatureRequest(requestId);
  }

  async function deleteAction() {
    "use server";
    await deleteSignatureRequest(requestId);
    redirect("/firmas");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canSend(status) ? (
        <SignatureActionForm action={sendAction} pendingLabel="Enviando..." successMessage="Solicitud enviada">
          <>
            <Send className="h-4 w-4" />
            Enviar
          </>
        </SignatureActionForm>
      ) : null}

      {canResend(status) ? (
        <SignatureActionForm
          action={resendAction}
          pendingLabel="Reenviando..."
          successMessage="Solicitud reenviada"
          variant="outline"
        >
          <>
            <RotateCw className="h-4 w-4" />
            Reenviar pendientes
          </>
        </SignatureActionForm>
      ) : null}

      {signedRecipientCount > 0 ? (
        <Button asChild variant="outline">
          <a href={`/api/signatures/${requestId}/partial-document`}>
            <Download className="h-4 w-4" />
            PDF con firmas actuales
          </a>
        </Button>
      ) : null}

      {status === "SIGNED" ? (
        <>
          {signedDocumentAvailable ? (
            <Button asChild variant="outline">
              <a href={`/api/signatures/${requestId}/signed-document`}>
                <Download className="h-4 w-4" />
                PDF firmado
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              <Download className="h-4 w-4" />
              PDF generandose
            </Button>
          )}
          {signatureImageAvailable ? (
            <Button asChild variant="outline">
              <a href={`/api/signatures/${requestId}/signature-image`}>
                <Download className="h-4 w-4" />
                Firma
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              <Download className="h-4 w-4" />
              Firma pendiente
            </Button>
          )}
          {certificateAvailable ? (
            <Button asChild variant="outline">
              <a href={`/api/signatures/${requestId}/certificate`}>
                <Download className="h-4 w-4" />
                Constancia
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              <Download className="h-4 w-4" />
              Constancia pendiente
            </Button>
          )}
        </>
      ) : null}

      {canCancel(status) ? (
        <form action={cancelAction}>
          <Button type="submit" variant="outline">
            <Ban className="h-4 w-4" />
            Cancelar
          </Button>
        </form>
      ) : null}

      <form action={deleteAction}>
        <Button type="submit" variant="ghost">
          <Trash2 className="h-4 w-4" />
          Eliminar solicitud
        </Button>
      </form>
    </div>
  );
}
