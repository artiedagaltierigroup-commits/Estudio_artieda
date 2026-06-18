import { embedRecipientSignaturesInPdf } from "@/lib/signature-pdf";
import { SIGNATURE_BUCKET } from "@/lib/signature-files";
import {
  getAuthenticatedSignatureRequest,
  jsonError,
  logSignatureArtifactDownload,
} from "../downloads";

function getRecipientDisplayName(recipient: {
  firstName: string;
  lastName: string;
  fullName: string | null;
  email: string;
}) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAuthenticatedSignatureRequest(id);
  if ("error" in result) return result.error;

  const { request, supabase, userId } = result;
  if (!request.document) return jsonError("La solicitud no tiene documento disponible", 409);

  const signedRecipients = request.recipients.filter(
    (recipient) => recipient.status === "SIGNED" && recipient.signatureStoragePath && recipient.placements.length > 0
  );
  if (signedRecipients.length === 0) return jsonError("Todavia no hay firmas para insertar", 409);

  const { data: originalPdfData, error: originalPdfError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .download(request.document.originalStoragePath);
  if (originalPdfError || !originalPdfData) return jsonError("No se pudo leer el PDF original", 409);

  const recipients = [];
  for (const recipient of signedRecipients) {
    const { data: signatureData, error: signatureError } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .download(recipient.signatureStoragePath!);
    if (signatureError || !signatureData) continue;

    recipients.push({
      signerName: getRecipientDisplayName(recipient),
      signedAt: recipient.signedAt ?? new Date(),
      signaturePngBytes: Buffer.from(await signatureData.arrayBuffer()),
      placements: recipient.placements.map((placement) => ({
        pageNumber: placement.pageNumber,
        x: Number(placement.placementX),
        y: Number(placement.placementY),
        width: Number(placement.placementWidth),
        height: Number(placement.placementHeight),
      })),
    });
  }
  if (recipients.length === 0) return jsonError("No se pudieron leer las firmas disponibles", 409);

  const signed = await embedRecipientSignaturesInPdf({
    originalPdfBytes: Buffer.from(await originalPdfData.arrayBuffer()),
    recipients,
  });

  await logSignatureArtifactDownload({
    userId,
    requestId: request.id,
    documentId: request.document.id,
    artifact: "partial-document",
  });

  return new Response(Buffer.from(signed.signedPdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="firmas-actuales-${request.document.originalFileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
