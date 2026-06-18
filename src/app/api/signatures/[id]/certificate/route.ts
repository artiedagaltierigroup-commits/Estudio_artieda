import { buildSignatureStoragePath, SIGNATURE_BUCKET } from "@/lib/signature-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSignatureCertificateData,
  generateSignatureCertificatePdf,
} from "@/lib/signature-certificate";
import {
  downloadStorageObject,
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

  const { request, userId } = result;
  if (request.status !== "SIGNED" || !request.document?.signedSha256) {
    return jsonError("La constancia todavia no esta disponible", 409);
  }

  const signedRecipients = request.recipients.filter((recipient) => recipient.status === "SIGNED");
  const signerName =
    signedRecipients.length > 0
      ? signedRecipients.map((recipient) => getRecipientDisplayName(recipient)).join(", ")
      : request.recipientName;
  const signerEmail =
    signedRecipients.length > 0
      ? signedRecipients.map((recipient) => recipient.email).join(", ")
      : request.recipientEmail;
  const signatureSha256 =
    signedRecipients.length > 0
      ? signedRecipients
          .map((recipient) => recipient.signatureSha256)
          .filter(Boolean)
          .join(", ")
      : request.document.signatureSha256;

  const certificateData = buildSignatureCertificateData({
    requestId: request.id,
    subject: request.subject,
    signerName,
    signerEmail,
    clientName: request.client?.name,
    caseTitle: request.case?.title,
    originalSha256: request.document.originalSha256,
    signedSha256: request.document.signedSha256,
    signatureSha256,
    signedAt: request.signedAt,
    events: request.events,
  });
  const certificateBytes = await generateSignatureCertificatePdf(certificateData);
  const certificatePath = buildSignatureStoragePath({
    userId,
    requestId: request.id,
    kind: "certificate",
    fileName: "constancia-firma.pdf",
  });

  const supabase = createSupabaseAdminClient();
  const upload = await supabase.storage.from(SIGNATURE_BUCKET).upload(certificatePath, Buffer.from(certificateBytes), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) return jsonError("No se pudo generar la constancia", 409);

  const response = await downloadStorageObject(certificatePath, "application/pdf", "constancia-firma.pdf");
  if (response.status >= 400) return response;

  await logSignatureArtifactDownload({
    userId,
    requestId: request.id,
    documentId: request.document.id,
    artifact: "certificate",
  });

  return response;
}
