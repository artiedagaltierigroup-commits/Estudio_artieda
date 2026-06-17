import { logActivity } from "@/actions/activity-log";
import { db } from "@/db";
import { signatureEvents } from "@/db/schema";
import { SIGNATURE_BUCKET } from "@/lib/signature-files";
import { createClient } from "@/lib/supabase/server";

type DownloadArtifact = "signed-document" | "signature-image" | "certificate";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function downloadResponse(bytes: ArrayBuffer, params: { contentType: string; fileName: string }) {
  return new Response(bytes, {
    headers: {
      "Content-Type": params.contentType,
      "Content-Disposition": `attachment; filename="${params.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function getAuthenticatedSignatureRequest(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: jsonError("No autenticado", 401) };

  const request = await db.query.signatureRequests.findFirst({
    where: (item, { and, eq }) => and(eq(item.id, id), eq(item.userId, user.id)),
    with: {
      client: true,
      case: true,
      document: true,
      events: {
        orderBy: (event, { asc }) => [asc(event.createdAt)],
      },
    },
  });

  if (!request) return { error: jsonError("Solicitud no encontrada", 404) };
  return { request, supabase, userId: user.id };
}

export async function downloadStorageObject(path: string, contentType: string, fileName: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(path);

  if (error || !data) return jsonError("El archivo todavia no esta disponible", 409);
  return downloadResponse(await data.arrayBuffer(), { contentType, fileName });
}

export async function logSignatureArtifactDownload(params: {
  userId: string;
  requestId: string;
  documentId: string;
  artifact: DownloadArtifact;
}) {
  await db.insert(signatureEvents).values({
    userId: params.userId,
    signatureRequestId: params.requestId,
    type: "downloaded",
    metadata: { artifact: params.artifact },
  });

  await logActivity({
    userId: params.userId,
    entityType: "document",
    entityId: params.documentId,
    action: "downloaded",
    newValue: {
      signatureRequestId: params.requestId,
      artifact: params.artifact,
    },
  });
}
