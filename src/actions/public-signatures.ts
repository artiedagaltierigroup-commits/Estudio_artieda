"use server";

import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { signatureEvents, signatureRequests } from "../db/schema";
import { SIGNATURE_BUCKET } from "../lib/signature-files";
import { createClient } from "../lib/supabase/server";

type PublicSignatureEventType =
  | "link_opened"
  | "document_viewed"
  | "signing_started"
  | "signing_interrupted"
  | "signed"
  | "rejected";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isTerminalStatus(status: string) {
  return ["SIGNED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status);
}

function isExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

async function getRequestByToken(token: string) {
  return db.query.signatureRequests.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.tokenHash, hashToken(token)),
    with: {
      client: {
        with: {
          savedSignature: true,
        },
      },
      document: true,
      events: {
        orderBy: (event, { desc }) => [desc(event.createdAt)],
      },
    },
  });
}

async function getRequestHeaders() {
  const headerStore = await headers();
  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

async function createPublicEvent(params: {
  token: string;
  type: PublicSignatureEventType;
  metadata?: Record<string, unknown>;
}) {
  const request = await getRequestByToken(params.token);
  if (!request) return null;

  const headerData = await getRequestHeaders();
  await db.insert(signatureEvents).values({
    userId: request.userId,
    signatureRequestId: request.id,
    type: params.type,
    metadata: params.metadata ?? null,
    ipAddress: headerData.ipAddress,
    userAgent: headerData.userAgent,
  });

  return request;
}

export async function getPublicSignatureRequest(token: string) {
  const request = await getRequestByToken(token);
  if (!request) return { error: "Solicitud no encontrada" };

  if (isExpired(request.tokenExpiresAt) && !isTerminalStatus(request.status)) {
    await db
      .update(signatureRequests)
      .set({ status: "EXPIRED", updatedAt: new Date() })
      .where(eq(signatureRequests.id, request.id));
    return { error: "Esta solicitud de firma vencio. Pedi al estudio que vuelva a enviarla." };
  }

  if (request.status === "CANCELLED") return { error: "Esta solicitud fue cancelada." };
  if (request.status === "REJECTED") return { error: "Esta solicitud fue rechazada." };
  if (!request.document) return { error: "La solicitud no tiene documento disponible." };

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(request.document.originalStoragePath, 60 * 10);

  return {
    request: {
      id: request.id,
      subject: request.subject,
      message: request.message,
      status: request.status,
      recipientName: request.recipientName,
      recipientEmail: request.recipientEmail,
      tokenExpiresAt: request.tokenExpiresAt,
      document: {
        originalFileName: request.document.originalFileName,
        previewUrl: data?.signedUrl ?? null,
        pageNumber: request.document.pageNumber,
        placementX: request.document.placementX,
        placementY: request.document.placementY,
        placementWidth: request.document.placementWidth,
        placementHeight: request.document.placementHeight,
      },
      savedSignatureAvailable: Boolean(request.client?.savedSignature),
    },
  };
}

export async function trackPublicSignatureEvent(token: string, eventType: PublicSignatureEventType) {
  const request = await createPublicEvent({ token, type: eventType });
  if (!request) return { error: "Solicitud no encontrada" };

  const statusByEvent: Partial<Record<PublicSignatureEventType, typeof signatureRequests.$inferSelect.status>> = {
    link_opened: "LINK_OPENED",
    document_viewed: "DOCUMENT_VIEWED",
    signing_started: "SIGNING_STARTED",
    signing_interrupted: "SIGNING_INTERRUPTED",
  };

  const nextStatus = statusByEvent[eventType];
  if (nextStatus && !isTerminalStatus(request.status)) {
    await db
      .update(signatureRequests)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(signatureRequests.id, request.id), eq(signatureRequests.tokenHash, hashToken(token))));
  }

  revalidatePath(`/firmas/${request.id}`);
  return { success: true };
}

export async function submitPublicSignature(token: string, formData: FormData) {
  const request = await getRequestByToken(token);
  if (!request) return { error: "Solicitud no encontrada" };
  if (isTerminalStatus(request.status)) return { error: "Esta solicitud ya no puede firmarse." };
  if (isExpired(request.tokenExpiresAt)) return { error: "Esta solicitud vencio." };

  const consent = formData.get("consent") === "on";
  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "");

  if (!consent) return { error: "Debes aceptar la firma electronica para continuar." };
  if (!signatureDataUrl.startsWith("data:image/png;base64,")) return { error: "Dibuja o selecciona una firma." };

  await createPublicEvent({
    token,
    type: "signed",
    metadata: {
      pendingPdfGeneration: true,
      saveForClient: formData.get("saveForClient") === "on",
    },
  });

  return { success: true, requestId: request.id };
}

export async function rejectPublicSignature(token: string, reason?: string) {
  const request = await getRequestByToken(token);
  if (!request) return { error: "Solicitud no encontrada" };
  if (isTerminalStatus(request.status)) return { error: "Esta solicitud ya no puede rechazarse." };

  const now = new Date();
  await db
    .update(signatureRequests)
    .set({ status: "REJECTED", rejectedAt: now, updatedAt: now })
    .where(and(eq(signatureRequests.id, request.id), eq(signatureRequests.tokenHash, hashToken(token))));

  await createPublicEvent({
    token,
    type: "rejected",
    metadata: { reason: reason?.trim() || null },
  });

  revalidatePath(`/firmas/${request.id}`);
  return { success: true };
}
