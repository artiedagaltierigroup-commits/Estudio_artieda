import { getPublicSignatureRequest, rejectPublicSignature, trackPublicSignatureEvent } from "@/actions/public-signatures";
import { PublicDocumentViewer } from "@/components/signatures/public-document-viewer";
import { PublicSignaturePad } from "@/components/signatures/public-signature-pad";
import { PublicSignatureReview } from "@/components/signatures/public-signature-review";
import { Button } from "@/components/ui/button";
import { FileSignature, ShieldAlert } from "lucide-react";

async function rejectAction(token: string) {
  "use server";
  await rejectPublicSignature(token, "Rechazado desde pantalla publica");
}

export default async function PublicSigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await trackPublicSignatureEvent(token, "link_opened");
  const result = await getPublicSignatureRequest(token);

  if ("error" in result) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <div className="rounded-[32px] border border-border/80 bg-white p-8 text-center shadow-[0_24px_80px_-60px_rgba(122,56,79,0.3)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#fff4f5] text-[#9d4d4d]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">No se puede abrir esta solicitud</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  const request = result.request;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-[32px] border border-border/80 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(122,56,79,0.3)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-primary/20 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary">
              Firma electronica
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
                Revisar y firmar documento
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Lee el documento, dibuja tu firma y confirma solo si estas conforme con el contenido.
              </p>
            </div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
            <FileSignature className="h-6 w-6" />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[32px] border border-border/80 bg-white/80 p-4 shadow-[0_24px_80px_-64px_rgba(122,56,79,0.28)]">
          <PublicDocumentViewer
            token={token}
            previewUrl={request.document.previewUrl}
            fileName={request.document.originalFileName}
            placement={{
              x: request.document.placementX,
              y: request.document.placementY,
              width: request.document.placementWidth,
              height: request.document.placementHeight,
            }}
          />
        </section>

        <aside className="space-y-4">
          <PublicSignatureReview
            subject={request.subject}
            message={request.message}
            recipientName={request.recipientName}
            recipientEmail={request.recipientEmail}
            tokenExpiresAt={request.tokenExpiresAt}
          />

          {request.status === "SIGNED" ? (
            <div className="rounded-[28px] border border-[#b8d8c5] bg-[#f4fbf6] p-6 text-center">
              <h2 className="text-lg font-semibold text-foreground">Documento ya firmado</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Esta solicitud ya fue completada. No hace falta volver a firmarla.
              </p>
            </div>
          ) : (
            <PublicSignaturePad
              token={token}
              savedSignatureAvailable={request.savedSignatureAvailable}
              canSaveSignatureForClient={request.canSaveSignatureForClient}
            />
          )}

          <form action={rejectAction.bind(null, token)}>
            <Button type="submit" variant="ghost" className="w-full">
              Rechazar solicitud
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
