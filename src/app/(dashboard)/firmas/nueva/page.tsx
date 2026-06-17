import {
  createSignatureDraft,
  getSignatureFormOptions,
  sendSignatureRequest,
  updateSignaturePlacement,
  uploadSignatureDocument,
} from "@/actions/signatures";
import { SignatureRequestForm } from "@/components/signatures/signature-request-form";
import { PageHeader } from "@/components/system/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSignature } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSubmit(formData: FormData) {
  "use server";

  const draft = await createSignatureDraft(formData);
  if (!draft.success) return;

  const requestId = draft.signatureRequestId;
  const upload = await uploadSignatureDocument(requestId, formData);

  if (upload.success) {
    await updateSignaturePlacement(requestId, {
      pageNumber: Number(formData.get("pageNumber") ?? 1),
      x: Number(formData.get("placementX") ?? 0.58),
      y: Number(formData.get("placementY") ?? 0.72),
      width: Number(formData.get("placementWidth") ?? 0.28),
      height: Number(formData.get("placementHeight") ?? 0.12),
    });
    await sendSignatureRequest(requestId);
  }

  redirect(`/firmas/${requestId}`);
}

interface NuevaFirmaPageProps {
  searchParams?: Promise<{
    clientId?: string;
    caseId?: string;
  }>;
}

export default async function NuevaFirmaPage({ searchParams }: NuevaFirmaPageProps) {
  const params = (await searchParams) ?? {};
  const options = await getSignatureFormOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centro de firmas"
        title="Nueva solicitud de firma"
        description="Sube un PDF, marca la ubicacion de la firma, define destinatario y envia el aviso por correo."
        stats={[
          { label: "Clientes disponibles", value: `${options.clients.length}` },
          { label: "Casos disponibles", value: `${options.cases.length}` },
          { label: "Flujo", value: "PDF + correo + seguimiento" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/firmas">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="rounded-[28px] border border-border/70 bg-white/85 px-5 py-4 text-sm leading-6 text-muted-foreground">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
            <FileSignature className="h-4 w-4" />
          </span>
          <p>
            La solicitud se guarda primero como borrador. Si el envio del correo o la subida del documento falla,
            quedara recuperable desde el Centro de firmas.
          </p>
        </div>
      </div>

      <SignatureRequestForm
        action={handleSubmit}
        cancelHref="/firmas"
        clients={options.clients}
        cases={options.cases}
        defaultClientId={params.clientId}
        defaultCaseId={params.caseId}
      />
    </div>
  );
}
