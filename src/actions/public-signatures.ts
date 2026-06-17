"use server";

import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { clientSavedSignatures, signatureDocuments, signatureEvents, signatureRequests } from "../db/schema";
import { buildSignatureStoragePath, hashBufferSha256, SIGNATURE_BUCKET } from "../lib/signature-files";
import { embedSignatureInPdf } from "../lib/signature-pdf";
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

function decodeDataUrl(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
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
  if (!request.document) return { error: "La solicitud no tiene documento disponible." };

  const consent = formData.get("consent") === "on";
  const useSavedSignature = formData.get("useSavedSignature") === "on";
  const saveForClient = formData.get("saveForClient") === "on";
  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "");

  if (!consent) return { error: "Debes aceptar la firma electronica para continuar." };
  if (!useSavedSignature && !signatureDataUrl.startsWith("data:image/png;base64,")) {
    return { error: "Dibuja o selecciona una firma." };
  }

  const supabase = await createClient();
  const { data: originalPdfData, error: originalPdfError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .download(request.document.originalStoragePath);
  if (originalPdfError || !originalPdfData) return { error: "No se pudo leer el PDF original." };

  let signatureBytes: Buffer;
  if (useSavedSignature) {
    const savedSignaturePath = request.client?.savedSignature?.storagePath;
    if (!savedSignaturePath) return { error: "No hay firma guardada disponible." };
    const { data: savedSignatureData, error: savedSignatureError } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .download(savedSignaturePath);
    if (savedSignatureError || !savedSignatureData) return { error: "No se pudo leer la firma guardada." };
    signatureBytes = Buffer.from(await savedSignatureData.arrayBuffer());
  } else {
    signatureBytes = decodeDataUrl(signatureDataUrl);
  }

  const signedAt = new Date();
  const signerName = request.recipientName ?? request.recipientEmail;
  const originalPdfBytes = Buffer.from(await originalPdfData.arrayBuffer());
  const signed = await embedSignatureInPdf({
    originalPdfBytes,
    signaturePngBytes: signatureBytes,
    signerName,
    signedAt,
    pageNumber: request.document.pageNumber,
    placement: {
      x: Number(request.document.placementX),
      y: Number(request.document.placementY),
      width: Number(request.document.placementWidth),
      height: Number(request.document.placementHeight),
    },
  });

  const signatureSha256 = await hashBufferSha256(signatureBytes);
  const signatureStoragePath = buildSignatureStoragePath({
    userId: request.userId,
    requestId: request.id,
    kind: "signature",
    fileName: "firma.png",
  });
  const signedStoragePath = buildSignatureStoragePath({
    userId: request.userId,
    requestId: request.id,
    kind: "signed",
    fileName: `firmado-${request.document.originalFileName}`,
  });

  const signatureUpload = await supabase.storage.from(SIGNATURE_BUCKET).upload(signatureStoragePath, signatureBytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (signatureUpload.error) return { error: signatureUpload.error.message };

  const signedUpload = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(signedStoragePath, Buffer.from(signed.signedPdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (signedUpload.error) return { error: signedUpload.error.message };

  await db
    .update(signatureDocuments)
    .set({
      signatureStoragePath,
      signatureSha256,
      signedStoragePath,
      signedSha256: signed.signedSha256,
      updatedAt: signedAt,
    })
    .where(eq(signatureDocuments.id, request.document.id));

  await db
    .update(signatureRequests)
    .set({ status: "SIGNED", signedAt, updatedAt: signedAt })
    .where(and(eq(signatureRequests.id, request.id), eq(signatureRequests.tokenHash, hashToken(token))));

  if (saveForClient && request.clientId && !useSavedSignature) {
    const existingSavedSignature = request.client?.savedSignature;
    if (existingSavedSignature) {
      await db
        .update(clientSavedSignatures)
        .set({
          signerName: request.recipientName,
          signerEmail: request.recipientEmail,
          storagePath: signatureStoragePath,
          sha256: signatureSha256,
          consentedAt: signedAt,
          lastUsedAt: signedAt,
          updatedAt: signedAt,
        })
        .where(eq(clientSavedSignatures.id, existingSavedSignature.id));
    } else {
      await db.insert(clientSavedSignatures).values({
        userId: request.userId,
        clientId: request.clientId,
        signerName: request.recipientName,
        signerEmail: request.recipientEmail,
        storagePath: signatureStoragePath,
        sha256: signatureSha256,
        consentedAt: signedAt,
        lastUsedAt: signedAt,
      });
    }
  }

  await createPublicEvent({
    token,
    type: "signed",
    metadata: {
      signedSha256: signed.signedSha256,
      signatureSha256,
      usedSavedSignature: useSavedSignature,
      savedForClient: saveForClient && Boolean(request.clientId),
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
