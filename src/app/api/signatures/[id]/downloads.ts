import { logActivity } from "@/lib/activity-log";
import { db } from "@/db";
import { signatureEvents } from "@/db/schema";
import { SIGNATURE_BUCKET } from "@/lib/signature-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess, WorkspaceAccessError } from "@/lib/workspace-access";
import { signatureCaseColumns } from "@/lib/signature-case-projection";
import { isOwnedSignatureRequestGraph, isSignatureStoragePath, type SignatureStorageScope } from "@/lib/signature-storage-scope";

type DownloadArtifact = "signed-document" | "signature-image" | "certificate" | "partial-document";

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
  let access;
  try {
    access = await getWorkspaceAccess();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return { error: jsonError(error.message, error.status) };
    throw error;
  }
  const { ownerUserId: userId, actorUserId } = access;

  const request = await db.query.signatureRequests.findFirst({
    where: (item, { and, eq }) => and(eq(item.id, id), eq(item.userId, userId)),
    with: {
      client: true,
      case: { columns: signatureCaseColumns },
      document: true,
      recipients: {
        orderBy: (recipient, { asc }) => [asc(recipient.sortOrder)],
        with: {
          placements: {
            orderBy: (placement, { asc }) => [asc(placement.sortOrder)],
          },
        },
      },
      events: {
        orderBy: (event, { asc }) => [asc(event.createdAt)],
      },
    },
  });

  if (!request || !isOwnedSignatureRequestGraph(request, userId)) return { error: jsonError("Solicitud no encontrada", 404) };
  return { request, userId, actorUserId };
}

export async function downloadStorageObject(path: string, contentType: string, fileName: string, scope: SignatureStorageScope) {
  if (!isSignatureStoragePath(path, scope)) return jsonError("Archivo no disponible", 404);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(path);

  if (error || !data) return jsonError("El archivo todavia no esta disponible", 409);
  return downloadResponse(await data.arrayBuffer(), { contentType, fileName });
}

export async function logSignatureArtifactDownload(params: {
  userId: string;
  actorUserId: string;
  requestId: string;
  documentId: string;
  artifact: DownloadArtifact;
}) {
  await db.insert(signatureEvents).values({
    userId: params.userId,
    signatureRequestId: params.requestId,
    type: "downloaded",
    metadata: { artifact: params.artifact, actorUserId: params.actorUserId },
  });

  await logActivity({
    userId: params.userId,
    actorUserId: params.actorUserId,
    entityType: "document",
    entityId: params.documentId,
    action: "downloaded",
    newValue: {
      signatureRequestId: params.requestId,
      artifact: params.artifact,
    },
  });
}
