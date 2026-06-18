import { getPublicSignatureRequest, trackPublicSignatureEvent } from "@/actions/public-signatures";
import { PublicSignaturePad } from "@/components/signatures/public-signature-pad";
import { PublicSignatureReview } from "@/components/signatures/public-signature-review";
import { FileSignature, ShieldAlert } from "lucide-react";

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
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-[32px] border border-border/80 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(122,56,79,0.3)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-primary/20 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary">
              Firma electronica
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Firmar solicitud</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Dibuja tu firma y enviala al estudio desde este link seguro.
              </p>
            </div>
          </div>
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
            <FileSignature className="h-6 w-6" />
          </div>
        </div>
      </header>

      <PublicSignatureReview
        subject={request.subject}
        message={request.message}
        recipientName={request.recipientName}
        recipientEmail={request.recipientEmail}
        tokenExpiresAt={request.tokenExpiresAt}
      />

      {request.recipientStatus === "SIGNED" ? (
        <div className="rounded-[28px] border border-[#b8d8c5] bg-[#f4fbf6] p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Firma ya enviada</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            El estudio ya recibio tu firma. No hace falta volver a enviarla.
          </p>
        </div>
      ) : (
        <PublicSignaturePad token={token} />
      )}
    </div>
  );
}
