import { createHash } from "crypto";
import { db } from "@/db";
import { signatureEvents } from "@/db/schema";
import { SIGNATURE_BUCKET } from "@/lib/signature-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isOwnedSignatureRequestGraph, isSignatureStoragePath } from "@/lib/signature-storage-scope";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getDownloadName(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `${cleanName || "documento"}-firmado.pdf`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashToken(token);

  const recipient = await db.query.signatureRecipients.findFirst({
    where: (item, { eq }) => eq(item.signedCopyTokenHash, tokenHash),
    with: {
      request: {
        with: {
          document: true,
        },
      },
    },
  });

  if (!recipient?.request.sendSignedCopyToRecipients || recipient.request.status !== "SIGNED" ||
      recipient.signatureRequestId !== recipient.request.id || !isOwnedSignatureRequestGraph(recipient.request, recipient.userId)) {
    return new Response("Documento no disponible", { status: 404 });
  }

  if (!recipient.signedCopyTokenExpiresAt || recipient.signedCopyTokenExpiresAt.getTime() < Date.now()) {
    return new Response("Link vencido", { status: 410 });
  }

  const document = recipient.request.document;
  if (!document) return new Response("Documento no disponible", { status: 404 });
  const signedStoragePath = document.signedStoragePath;
  if (!isSignatureStoragePath(signedStoragePath, { userId: recipient.userId, requestId: recipient.request.id })) {
    return new Response("Documento no disponible", { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(signedStoragePath);
  if (error || !data) return new Response("Documento no disponible", { status: 404 });

  await db.insert(signatureEvents).values({
    userId: recipient.userId,
    signatureRequestId: recipient.signatureRequestId,
    signatureRecipientId: recipient.id,
    type: "downloaded",
    metadata: { artifact: "signed-document-copy" },
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  const bytes = Buffer.from(await data.arrayBuffer());
  const fileName = getDownloadName(document.originalFileName);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
