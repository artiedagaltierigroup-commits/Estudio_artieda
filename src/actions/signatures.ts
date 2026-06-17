"use server";

import { createHash, randomBytes } from "crypto";
import { and, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db";
import { signatureDocuments, signatureEvents, signatureRequests } from "../db/schema";
import { buildSignatureStoragePath, hashBufferSha256, SIGNATURE_BUCKET } from "../lib/signature-files";
import { shouldOfferSavedSignature } from "../lib/client-saved-signatures";
import type { SignatureRequestStatus } from "../lib/signature-status";
import { createClient } from "../lib/supabase/server";
import { logActivity } from "./activity-log";
import { normalizeSignatureEmail } from "./signatures-helpers";

const DEFAULT_EXPIRATION_DAYS = 15;

const SignatureDraftSchema = z.object({
  clientId: z.string().uuid("Cliente invalido").optional().or(z.literal("")),
  caseId: z.string().uuid("Caso invalido").optional().or(z.literal("")),
  subject: z.string().trim().min(1, "El asunto es obligatorio"),
  message: z.string().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email("Email del destinatario invalido"),
  recipientTaxId: z.string().optional(),
});

const PlacementSchema = z.object({
  pageNumber: z.coerce.number().int().min(1),
  x: z.coerce.number().min(0).max(1),
  y: z.coerce.number().min(0).max(1),
  width: z.coerce.number().min(0.01).max(1),
  height: z.coerce.number().min(0.01).max(1),
});

type SignatureEventType =
  | "created"
  | "document_uploaded"
  | "placement_selected"
  | "sent"
  | "resent"
  | "cancelled"
  | "downloaded";

type SignatureSort = "recent" | "oldest" | "status" | "recipient";

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalUuid(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildTokenExpiration(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRATION_DAYS);
  return expiresAt;
}

function buildSigningUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/firmar/${token}`;
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

async function logSignatureEvent(params: {
  userId: string;
  signatureRequestId: string;
  type: SignatureEventType;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(signatureEvents).values({
    userId: params.userId,
    signatureRequestId: params.signatureRequestId,
    type: params.type,
    metadata: params.metadata ?? null,
  });
}

function revalidateSignaturePaths(request: { id: string; clientId?: string | null; caseId?: string | null }) {
  revalidatePath("/firmas");
  revalidatePath(`/firmas/${request.id}`);
  if (request.clientId) revalidatePath(`/clientes/${request.clientId}`);
  if (request.caseId) revalidatePath(`/casos/${request.caseId}`);
}

async function getOwnedSignatureRequest(id: string, userId: string) {
  return db.query.signatureRequests.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      client: true,
      case: true,
      document: true,
      events: {
        orderBy: (event, { desc }) => [desc(event.createdAt)],
      },
    },
  });
}

async function sendSignatureEmail(params: {
  to: string;
  subject: string;
  message?: string | null;
  signingUrl: string;
}) {
  console.info("Signature email pending provider", params);
}

export async function getSignatureRequests(filters?: {
  query?: string;
  status?: string;
  sort?: SignatureSort;
}) {
  const userId = await getUserId();
  const query = filters?.query?.trim();
  const status = filters?.status?.trim();

  const rows = await db.query.signatureRequests.findMany({
    where: (item, { and: andOperator, eq: eqOperator }) => {
      const clauses = [eqOperator(item.userId, userId)];
      if (status && status !== "all") clauses.push(eqOperator(item.status, status as SignatureRequestStatus));
      if (query) {
        clauses.push(
          or(
            ilike(item.subject, `%${query}%`),
            ilike(item.recipientEmail, `%${query}%`),
            ilike(item.recipientName, `%${query}%`)
          )!
        );
      }
      return andOperator(...clauses);
    },
    with: {
      client: true,
      case: true,
      document: true,
      events: {
        orderBy: (event, { desc }) => [desc(event.createdAt)],
        limit: 1,
      },
    },
    orderBy: (item, { asc, desc }) => {
      switch (filters?.sort) {
        case "oldest":
          return [asc(item.createdAt)];
        case "status":
          return [asc(item.status), desc(item.createdAt)];
        case "recipient":
          return [asc(item.recipientEmail), desc(item.createdAt)];
        case "recent":
        default:
          return [desc(item.createdAt)];
      }
    },
  });

  return rows.map((row) => ({
    ...row,
    latestEvent: row.events[0] ?? null,
  }));
}

export async function getSignatureRequest(id: string) {
  const userId = await getUserId();
  return getOwnedSignatureRequest(id, userId);
}

export async function getSignatureFormOptions() {
  const userId = await getUserId();
  const [clientRows, caseRows] = await Promise.all([
    db.query.clients.findMany({
      where: (client, { eq: eqOperator }) => eqOperator(client.userId, userId),
      orderBy: (client, { asc }) => [asc(client.name)],
      with: {
        savedSignature: true,
      },
    }),
    db.query.cases.findMany({
      where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
      orderBy: (item, { desc }) => [desc(item.updatedAt)],
      with: {
        client: true,
      },
    }),
  ]);

  return {
    clients: clientRows.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      taxId: client.taxId,
      hasSavedSignature: shouldOfferSavedSignature({
        clientId: client.id,
        savedSignatureId: client.savedSignature?.id ?? null,
      }),
    })),
    cases: caseRows.map((currentCase) => ({
      id: currentCase.id,
      title: currentCase.title,
      clientId: currentCase.clientId,
      clientName: currentCase.client?.name ?? null,
    })),
  };
}

export async function createSignatureDraft(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = SignatureDraftSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const token = buildToken();
  const tokenExpiresAt = buildTokenExpiration();
  const caseId = normalizeOptionalUuid(parsed.data.caseId);
  const clientId = normalizeOptionalUuid(parsed.data.clientId);

  if (caseId) {
    const currentCase = await db.query.cases.findFirst({
      where: (item, { and: andOperator, eq: eqOperator }) =>
        andOperator(eqOperator(item.id, caseId), eqOperator(item.userId, userId)),
    });
    if (!currentCase) return { error: "Caso no encontrado" };
    if (clientId && currentCase.clientId !== clientId) return { error: "El caso no pertenece al cliente seleccionado" };
  }

  const [inserted] = await db
    .insert(signatureRequests)
    .values({
      userId,
      clientId,
      caseId,
      subject: parsed.data.subject.trim(),
      message: normalizeOptionalText(parsed.data.message),
      recipientName: normalizeOptionalText(parsed.data.recipientName),
      recipientEmail: normalizeSignatureEmail(parsed.data.recipientEmail),
      recipientTaxId: normalizeOptionalText(parsed.data.recipientTaxId),
      tokenHash: hashToken(token),
      tokenExpiresAt,
    })
    .returning();

  await logSignatureEvent({
    userId,
    signatureRequestId: inserted.id,
    type: "created",
    metadata: { recipientEmail: inserted.recipientEmail },
  });

  await logActivity({
    userId,
    entityType: "signature_request",
    entityId: inserted.id,
    action: "created",
    newValue: {
      subject: inserted.subject,
      recipientEmail: inserted.recipientEmail,
      clientId,
      caseId,
    },
  });

  revalidateSignaturePaths(inserted);
  return { success: true, signatureRequestId: inserted.id };
}

export async function uploadSignatureDocument(requestId: string, formData: FormData) {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (request.status === "SIGNED" || request.status === "CANCELLED") {
    return { error: "La solicitud ya no admite cambios de documento" };
  }

  const file = formData.get("document");
  if (!(file instanceof File)) return { error: "Subi un PDF para continuar" };
  if (file.type !== "application/pdf") return { error: "El documento debe ser PDF" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalSha256 = await hashBufferSha256(buffer);
  const storagePath = buildSignatureStoragePath({
    userId,
    requestId,
    kind: "original",
    fileName: file.name,
  });

  const supabase = await createClient();
  const { error } = await supabase.storage.from(SIGNATURE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return { error: error.message };

  const existingDocument = request.document;
  if (existingDocument) {
    await db
      .update(signatureDocuments)
      .set({
        originalFileName: file.name,
        originalStoragePath: storagePath,
        originalSha256,
        updatedAt: new Date(),
      })
      .where(and(eq(signatureDocuments.id, existingDocument.id), eq(signatureDocuments.userId, userId)));
  } else {
    await db.insert(signatureDocuments).values({
      userId,
      signatureRequestId: requestId,
      originalFileName: file.name,
      originalStoragePath: storagePath,
      originalSha256,
      pageNumber: 1,
      placementX: "0.58",
      placementY: "0.72",
      placementWidth: "0.28",
      placementHeight: "0.12",
    });
  }

  await db
    .update(signatureRequests)
    .set({ status: "READY", updatedAt: new Date() })
    .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

  await logSignatureEvent({
    userId,
    signatureRequestId: requestId,
    type: "document_uploaded",
    metadata: { fileName: file.name, originalSha256 },
  });

  revalidateSignaturePaths(request);
  return { success: true };
}

export async function updateSignaturePlacement(
  requestId: string,
  placement: { pageNumber: number; x: number; y: number; width: number; height: number }
) {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (!request.document) return { error: "Primero subi un PDF" };

  const parsed = PlacementSchema.safeParse(placement);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db
    .update(signatureDocuments)
    .set({
      pageNumber: parsed.data.pageNumber,
      placementX: parsed.data.x.toFixed(4),
      placementY: parsed.data.y.toFixed(4),
      placementWidth: parsed.data.width.toFixed(4),
      placementHeight: parsed.data.height.toFixed(4),
      updatedAt: new Date(),
    })
    .where(and(eq(signatureDocuments.id, request.document.id), eq(signatureDocuments.userId, userId)));

  await db
    .update(signatureRequests)
    .set({ status: "READY", updatedAt: new Date() })
    .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

  await logSignatureEvent({
    userId,
    signatureRequestId: requestId,
    type: "placement_selected",
    metadata: parsed.data,
  });

  revalidateSignaturePaths(request);
  return { success: true };
}

async function sendOrResendSignatureRequest(requestId: string, eventType: "sent" | "resent") {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (!request.document) return { error: "Subi el documento antes de enviar" };
  if (request.status === "SIGNED") return { error: "La solicitud ya esta firmada" };
  if (request.status === "CANCELLED") return { error: "La solicitud esta cancelada" };

  const token = buildToken();
  const tokenExpiresAt = buildTokenExpiration();
  const now = new Date();

  await db
    .update(signatureRequests)
    .set({
      status: "SENT",
      tokenHash: hashToken(token),
      tokenExpiresAt,
      sentAt: eventType === "sent" ? now : request.sentAt ?? now,
      updatedAt: now,
    })
    .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

  const signingUrl = buildSigningUrl(token);
  await sendSignatureEmail({
    to: request.recipientEmail,
    subject: request.subject,
    message: request.message,
    signingUrl,
  });

  await logSignatureEvent({
    userId,
    signatureRequestId: requestId,
    type: eventType,
    metadata: { recipientEmail: request.recipientEmail },
  });

  await logActivity({
    userId,
    entityType: "signature_request",
    entityId: requestId,
    action: eventType,
    newValue: { status: "SENT", tokenExpiresAt },
  });

  revalidateSignaturePaths(request);
  return { success: true, signingUrl };
}

export async function sendSignatureRequest(requestId: string) {
  return sendOrResendSignatureRequest(requestId, "sent");
}

export async function resendSignatureRequest(requestId: string) {
  return sendOrResendSignatureRequest(requestId, "resent");
}

export async function cancelSignatureRequest(requestId: string) {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (request.status === "SIGNED") return { error: "No se puede cancelar una solicitud firmada" };

  const cancelledAt = new Date();
  await db
    .update(signatureRequests)
    .set({ status: "CANCELLED", cancelledAt, updatedAt: cancelledAt })
    .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

  await logSignatureEvent({
    userId,
    signatureRequestId: requestId,
    type: "cancelled",
  });

  await logActivity({
    userId,
    entityType: "signature_request",
    entityId: requestId,
    action: "cancelled",
    previousValue: { status: request.status },
    newValue: { status: "CANCELLED", cancelledAt },
  });

  revalidateSignaturePaths(request);
  return { success: true };
}

export async function downloadSignedDocument(requestId: string) {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (!request.document?.signedStoragePath) return { error: "El PDF firmado todavia no esta disponible" };

  await logSignatureEvent({
    userId,
    signatureRequestId: requestId,
    type: "downloaded",
    metadata: { artifact: "signed-document" },
  });

  await logActivity({
    userId,
    entityType: "document",
    entityId: request.document.id,
    action: "downloaded",
    newValue: { signatureRequestId: requestId },
  });

  revalidateSignaturePaths(request);
  return { success: true, storagePath: request.document.signedStoragePath };
}

export async function getSignatureOriginalDocumentUrl(requestId: string) {
  const userId = await getUserId();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request?.document) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(request.document.originalStoragePath, 60 * 10);

  if (error) return null;
  return data.signedUrl;
}
