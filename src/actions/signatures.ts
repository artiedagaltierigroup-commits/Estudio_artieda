"use server";

import { createHash, randomBytes } from "crypto";
import { and, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { db } from "../db";
import {
  signatureDocuments,
  signatureEvents,
  signaturePlacements,
  signatureRecipients,
  signatureRequests,
} from "../db/schema";
import { shouldOfferSavedSignature } from "../lib/client-saved-signatures";
import { getFirstRecipientMissingPlacements } from "../lib/signature-recipients";
import { buildRecipientSignatureEmail, sendSignatureRequestEmail } from "../lib/signature-email";
import { buildSignatureStoragePath, hashBufferSha256, SIGNATURE_BUCKET } from "../lib/signature-files";
import type { SignatureRequestStatus } from "../lib/signature-status";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { getWorkspaceAccess, requireAdminAccess } from "../lib/workspace-access";
import { signatureCaseColumns } from "../lib/signature-case-projection";
import { logActivity } from "../lib/activity-log";
import { canEditSignatureDocument, withSignatureRequestLock, type SignatureTransaction } from "../lib/signature-transaction";
import { MAX_SIGNATURE_PDF_BYTES, MAX_SIGNATURE_PDF_MB } from "../lib/signature-limits";
import { SignaturePlacementSchema } from "../lib/signature-placement-validation";
import { isOwnedSignatureRequestGraph, isSignatureStoragePath } from "../lib/signature-storage-scope";
import {
  buildRecipientTokenPayloads,
  parseSendSignedCopyToRecipients,
  parseSignatureRecipientsFromFormData,
  validateSignatureRecipients,
} from "./signatures-helpers";

const DEFAULT_EXPIRATION_DAYS = 15;

const SignatureDraftSchema = z.object({
  clientId: z.string().uuid("Cliente invalido").optional().or(z.literal("")),
  caseId: z.string().uuid("Caso invalido").optional().or(z.literal("")),
  subject: z.string().trim().min(1, "El asunto es obligatorio"),
  message: z.string().optional(),
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

async function logSignatureEvent(params: {
  userId: string;
  actorUserId: string;
  signatureRequestId: string;
  signatureRecipientId?: string | null;
  signaturePlacementId?: string | null;
  type: SignatureEventType;
  metadata?: Record<string, unknown>;
}, executor: typeof db | SignatureTransaction = db) {
  await executor.insert(signatureEvents).values({
    userId: params.userId,
    signatureRequestId: params.signatureRequestId,
    signatureRecipientId: params.signatureRecipientId ?? null,
    signaturePlacementId: params.signaturePlacementId ?? null,
    type: params.type,
    metadata: { ...params.metadata, actorUserId: params.actorUserId },
  });
}

function revalidateSignaturePaths(request: { id: string; clientId?: string | null; caseId?: string | null }) {
  revalidatePath("/firmas");
  revalidatePath(`/firmas/${request.id}`);
  if (request.clientId) revalidatePath(`/clientes/${request.clientId}`);
  if (request.caseId) revalidatePath(`/casos/${request.caseId}`);
}

async function getOwnedSignatureRequest(id: string, userId: string, executor: typeof db | SignatureTransaction = db) {
  const request = await executor.query.signatureRequests.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      client: true,
      case: { columns: signatureCaseColumns },
      document: true,
      recipients: {
        orderBy: (recipient, { asc }) => [asc(recipient.sortOrder)],
        with: {
          client: true,
          placements: {
            orderBy: (placement, { asc }) => [asc(placement.sortOrder)],
          },
          events: {
            orderBy: (event, { desc }) => [desc(event.createdAt)],
          },
        },
      },
      placements: {
        orderBy: (placement, { asc }) => [asc(placement.sortOrder)],
      },
      events: {
        orderBy: (event, { desc }) => [desc(event.createdAt)],
      },
    },
  });
  return request && isOwnedSignatureRequestGraph(request, userId) ? request : undefined;
}

export async function getSignatureRequests(filters?: {
  query?: string;
  status?: string;
  sort?: SignatureSort;
}) {
  const { ownerUserId: userId } = await getWorkspaceAccess();
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
      case: { columns: signatureCaseColumns },
      document: true,
      recipients: {
        orderBy: (recipient, { asc }) => [asc(recipient.sortOrder)],
      },
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

  return rows.filter((row) => isOwnedSignatureRequestGraph(row, userId)).map((row) => ({
    ...row,
    latestEvent: row.events[0] ?? null,
  }));
}

export async function getSignatureRequest(id: string) {
  const { ownerUserId: userId } = await getWorkspaceAccess();
  return getOwnedSignatureRequest(id, userId);
}

export async function getSignatureFormOptions() {
  const { ownerUserId: userId } = await getWorkspaceAccess();
  const [clientRows, caseRows] = await Promise.all([
    db.query.clients.findMany({
      where: (client, { eq: eqOperator }) => eqOperator(client.userId, userId),
      orderBy: (client, { asc }) => [asc(client.name)],
      with: {
        savedSignature: true,
      },
    }),
    db.query.cases.findMany({
      columns: signatureCaseColumns,
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
        savedSignatureId: client.savedSignature?.userId === userId && client.savedSignature.clientId === client.id ? client.savedSignature.id : null,
      }),
    })),
    cases: caseRows.filter((currentCase) => currentCase.client?.userId === userId).map((currentCase) => ({
      id: currentCase.id,
      title: currentCase.title,
      clientId: currentCase.clientId,
      clientName: currentCase.client?.name ?? null,
    })),
  };
}

export async function createSignatureDraft(formData: FormData) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  const raw = Object.fromEntries(formData.entries());
  const parsed = SignatureDraftSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const recipients = parseSignatureRecipientsFromFormData(formData);
  const recipientValidation = validateSignatureRecipients(recipients);
  if (!recipientValidation.success) return { error: recipientValidation.error };

  const tokenExpiresAt = buildTokenExpiration();
  const caseId = normalizeOptionalUuid(parsed.data.caseId);
  const recipientTokenPayloads = buildRecipientTokenPayloads(recipients, {
    tokenFactory: () => buildToken(),
    hashToken,
    tokenExpiresAt,
  });
  const primaryPayload = recipientTokenPayloads[0];
  const primaryRecipient = primaryPayload.recipient;

  const recipientClientIds = [...new Set(recipients.map((recipient) => recipient.clientId).filter(Boolean))] as string[];
  if (recipientClientIds.length > 0) {
    const ownedClients = await db.query.clients.findMany({
      where: (client, { and: andOperator, eq: eqOperator }) =>
        andOperator(eqOperator(client.userId, userId), inArray(client.id, recipientClientIds)),
    });
    if (ownedClients.length !== recipientClientIds.length) return { error: "Cliente no encontrado" };
  }

  if (caseId) {
    const currentCase = await db.query.cases.findFirst({
      columns: signatureCaseColumns,
      with: { client: { columns: { id: true, userId: true } } },
      where: (item, { and: andOperator, eq: eqOperator }) =>
        andOperator(eqOperator(item.id, caseId), eqOperator(item.userId, userId)),
    });
    if (!currentCase || currentCase.client?.userId !== userId) return { error: "Caso no encontrado" };
  }

  const [inserted] = await db
    .insert(signatureRequests)
    .values({
      userId,
      clientId: primaryRecipient.clientId,
      caseId,
      subject: parsed.data.subject.trim(),
      message: normalizeOptionalText(parsed.data.message),
      sendSignedCopyToRecipients: parseSendSignedCopyToRecipients(formData),
      recipientName: primaryRecipient.fullName,
      recipientEmail: primaryRecipient.email,
      recipientTaxId: primaryRecipient.taxId,
      tokenHash: primaryPayload.tokenHash,
      tokenExpiresAt,
    })
    .returning();

  const insertedRecipients = await db
    .insert(signatureRecipients)
    .values(
      recipientTokenPayloads.map((payload, index) => ({
        userId,
        signatureRequestId: inserted.id,
        clientId: payload.recipient.clientId,
        firstName: payload.recipient.firstName || payload.recipient.email,
        lastName: payload.recipient.lastName,
        fullName: payload.recipient.fullName,
        email: payload.recipient.email,
        taxId: payload.recipient.taxId,
        tokenHash: payload.tokenHash,
        tokenExpiresAt: payload.tokenExpiresAt,
        sortOrder: index,
      }))
    )
    .returning();

  const placementValues = insertedRecipients.flatMap((recipient, recipientIndex) =>
    recipients[recipientIndex].placements.map((placement, placementIndex) => ({
      userId,
      signatureRequestId: inserted.id,
      recipientId: recipient.id,
      pageNumber: placement.pageNumber,
      placementX: placement.x.toFixed(4),
      placementY: placement.y.toFixed(4),
      placementWidth: placement.width.toFixed(4),
      placementHeight: placement.height.toFixed(4),
      sortOrder: placementIndex,
    }))
  );

  if (placementValues.length > 0) {
    await db.insert(signaturePlacements).values(placementValues);
  }

  await logSignatureEvent({
    userId,
    actorUserId,
    signatureRequestId: inserted.id,
    type: "created",
    metadata: {
      recipientCount: recipients.length,
      recipientEmails: recipients.map((recipient) => recipient.email),
    },
  });

  await logActivity({
    userId,
    actorUserId,
    entityType: "signature_request",
    entityId: inserted.id,
    action: "created",
    newValue: {
      subject: inserted.subject,
      recipientEmail: inserted.recipientEmail,
      recipientCount: recipients.length,
      clientId: primaryRecipient.clientId,
      caseId,
    },
  });

  revalidateSignaturePaths(inserted);
  return { success: true, signatureRequestId: inserted.id };
}

export async function uploadSignatureDocument(requestId: string, formData: FormData) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  return withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };
    if (!canEditSignatureDocument(request)) {
      return { error: "La solicitud ya no admite cambios de documento" };
    }

    const file = formData.get("document");
    if (!(file instanceof File)) return { error: "Subi un PDF para continuar" };
    if (file.type !== "application/pdf") return { error: "El documento debe ser PDF" };
    if (file.size === 0 || file.size > MAX_SIGNATURE_PDF_BYTES) return { error: `El PDF debe tener contenido y no puede superar ${MAX_SIGNATURE_PDF_MB} MB` };

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const pdf = await PDFDocument.load(buffer);
      if (pdf.getPageCount() === 0) return { error: "El PDF no tiene paginas" };
      if (request.recipients.some((recipient) => recipient.placements.some((placement) => placement.pageNumber > pdf.getPageCount()))) {
        return { error: "Una ubicacion de firma queda fuera de las paginas del PDF" };
      }
    } catch { return { error: "El documento no es un PDF valido o esta protegido" }; }
    const originalSha256 = await hashBufferSha256(buffer);
    const storagePath = buildSignatureStoragePath({
      userId,
      requestId,
      kind: "original",
      fileName: `${originalSha256}-${file.name}`,
    });

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(SIGNATURE_BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) return { error: error.message };

    const existingDocument = request.document;
    if (existingDocument) {
      await tx
        .update(signatureDocuments)
        .set({
          originalFileName: file.name,
          originalStoragePath: storagePath,
          originalSha256,
          updatedAt: new Date(),
        })
        .where(and(eq(signatureDocuments.id, existingDocument.id), eq(signatureDocuments.userId, userId)));
    } else {
      await tx.insert(signatureDocuments).values({
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

    await tx
      .update(signatureRequests)
      .set({ status: "READY", updatedAt: new Date() })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    await logSignatureEvent({
      userId,
      actorUserId,
      signatureRequestId: requestId,
      type: "document_uploaded",
      metadata: { fileName: file.name, originalSha256 },
    }, tx);

    revalidateSignaturePaths(request);
    return { success: true };
  });
}

export async function updateSignaturePlacement(
  requestId: string,
  placement: { pageNumber: number; x: number; y: number; width: number; height: number }
) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  return withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };
    if (!request.document) return { error: "Primero subi un PDF" };
    if (!canEditSignatureDocument(request)) return { error: "La solicitud enviada ya no admite cambios de ubicacion" };

    const parsed = SignaturePlacementSchema.safeParse(placement);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    await tx
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

    await tx
      .update(signatureRequests)
      .set({ status: "READY", updatedAt: new Date() })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    await logSignatureEvent({
      userId,
      actorUserId,
      signatureRequestId: requestId,
      type: "placement_selected",
      metadata: parsed.data,
    }, tx);

    revalidateSignaturePaths(request);
    return { success: true };
  });
}

async function sendOrResendSignatureRequest(requestId: string, eventType: "sent" | "resent") {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  const prepared = await withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };
    if (!request.document) return { error: "Subi el documento antes de enviar" };
    if (request.status === "SIGNED") return { error: "La solicitud ya esta firmada" };
    if (request.status === "CANCELLED") return { error: "La solicitud esta cancelada" };
    if (request.status === "REJECTED" || request.status === "EXPIRED") return { error: "La solicitud finalizada requiere una nueva solicitud de firma" };

    const tokenExpiresAt = buildTokenExpiration();
    const now = new Date();
    const pendingRecipients = request.recipients.filter(
      (recipient) => recipient.status !== "SIGNED" && recipient.status !== "CANCELLED" && recipient.status !== "EXPIRED"
    );
    if (pendingRecipients.length === 0) return { error: "No hay destinatarios pendientes" };
    const recipientMissingPlacement = getFirstRecipientMissingPlacements(pendingRecipients);
    if (recipientMissingPlacement) {
      const label = recipientMissingPlacement.fullName || recipientMissingPlacement.email;
      return { error: `${label} necesita al menos un espacio de firma` };
    }

    const recipientPayloads = pendingRecipients.map((recipient) => {
      const token = buildToken();
      return {
        recipient,
        token,
        tokenHash: hashToken(token),
        email: buildRecipientSignatureEmail({
          recipientEmail: recipient.email,
          subject: request.subject,
          message: request.message,
          token,
        }),
      };
    });
    const primaryPayload = recipientPayloads[0];

    await tx
      .update(signatureRequests)
      .set({
        status: request.recipients.some((recipient) => recipient.status === "SIGNED") ? "PARTIALLY_SIGNED" : "SENT",
        tokenHash: primaryPayload.tokenHash,
        tokenExpiresAt,
        sentAt: eventType === "sent" ? now : request.sentAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    for (const payload of recipientPayloads) {
      await tx
        .update(signatureRecipients)
        .set({
          status: "SENT",
          tokenHash: payload.tokenHash,
          tokenExpiresAt,
          sentAt: eventType === "sent" ? now : payload.recipient.sentAt ?? now,
          updatedAt: now,
        })
        .where(and(eq(signatureRecipients.id, payload.recipient.id), eq(signatureRecipients.userId, userId)));

      await logSignatureEvent({
        userId,
        actorUserId,
        signatureRequestId: requestId,
        signatureRecipientId: payload.recipient.id,
        type: eventType,
        metadata: { recipientEmail: payload.recipient.email },
      }, tx);
    }

    await logSignatureEvent({
      userId,
      actorUserId,
      signatureRequestId: requestId,
      type: eventType,
      metadata: {
        recipientCount: recipientPayloads.length,
        recipientEmails: recipientPayloads.map((payload) => payload.recipient.email),
      },
    }, tx);

    await logActivity({
      userId,
      actorUserId,
      entityType: "signature_request",
      entityId: requestId,
      action: eventType,
      newValue: { status: "SENT", tokenExpiresAt },
    }, tx);

    revalidateSignaturePaths(request);
    return {
      success: true,
      emails: recipientPayloads.map((payload) => payload.email),
      signingUrl: primaryPayload.email.signingUrl,
      signingUrls: recipientPayloads.map((payload) => ({
        recipientId: payload.recipient.id,
        email: payload.recipient.email,
        signingUrl: payload.email.signingUrl,
      })),
    };
  });
  if ("error" in prepared) return prepared;
  // Commit the new tokens before delivery: a later mail failure must not invalidate an already delivered link.
  const { emails, ...result } = prepared;
  try { for (const email of emails) await sendSignatureRequestEmail(email); }
  catch { return { error: "La solicitud quedo guardada, pero no se pudieron enviar todos los correos. Podes reenviarlos desde el detalle." }; }
  return result;
}

export async function sendSignatureRequest(requestId: string) {
  return sendOrResendSignatureRequest(requestId, "sent");
}

export async function resendSignatureRequest(requestId: string) {
  return sendOrResendSignatureRequest(requestId, "resent");
}

export async function resendSignatureRecipient(requestId: string, recipientId: string) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  const prepared = await withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };
    if (!request.document) return { error: "Subi el documento antes de reenviar" };
    if (request.status === "SIGNED") return { error: "La solicitud ya esta firmada" };
    if (request.status === "CANCELLED") return { error: "La solicitud esta cancelada" };
    if (request.status === "REJECTED" || request.status === "EXPIRED") return { error: "La solicitud finalizada requiere una nueva solicitud de firma" };

    const recipient = request.recipients.find((item) => item.id === recipientId);
    if (!recipient) return { error: "Destinatario no encontrado" };
    if (recipient.status === "SIGNED") return { error: "El destinatario ya firmo" };
    if (recipient.status === "CANCELLED" || recipient.status === "EXPIRED") {
      return { error: "El destinatario ya no esta pendiente" };
    }
    if (getFirstRecipientMissingPlacements([recipient])) {
      const label = recipient.fullName || recipient.email;
      return { error: `${label} necesita al menos un espacio de firma` };
    }

    const now = new Date();
    const token = buildToken();
    const tokenHash = hashToken(token);
    const tokenExpiresAt = buildTokenExpiration(now);
    const email = buildRecipientSignatureEmail({
      recipientEmail: recipient.email,
      subject: request.subject,
      message: request.message,
      token,
    });

    await tx
      .update(signatureRecipients)
      .set({
        status: "SENT",
        tokenHash,
        tokenExpiresAt,
        sentAt: recipient.sentAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.userId, userId)));

    await tx
      .update(signatureRequests)
      .set({ status: request.recipients.some((item) => item.status === "SIGNED") ? "PARTIALLY_SIGNED" : "SENT", tokenHash, tokenExpiresAt, sentAt: request.sentAt ?? now, updatedAt: now })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    await logSignatureEvent({
      userId,
      actorUserId,
      signatureRequestId: requestId,
      signatureRecipientId: recipient.id,
      type: "resent",
      metadata: { recipientEmail: recipient.email },
    }, tx);

    await logActivity({
      userId,
      actorUserId,
      entityType: "signature_request",
      entityId: requestId,
      action: "resent",
      newValue: { recipientId: recipient.id, recipientEmail: recipient.email, tokenExpiresAt },
    }, tx);

    revalidateSignaturePaths(request);
    return { success: true, signingUrl: email.signingUrl, email };
  });
  if ("error" in prepared) return prepared;
  const { email, ...result } = prepared;
  try { await sendSignatureRequestEmail(email); }
  catch { return { error: "La solicitud quedo guardada, pero el correo no pudo enviarse. Intenta reenviarlo." }; }
  return result;
}

export async function cancelSignatureRequest(requestId: string) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  return withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };
    if (request.status === "SIGNED") return { error: "No se puede cancelar una solicitud firmada" };

    const cancelledAt = new Date();
    await tx
      .update(signatureRequests)
      .set({ status: "CANCELLED", cancelledAt, updatedAt: cancelledAt })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    await tx
      .update(signatureRecipients)
      .set({ status: "CANCELLED", cancelledAt, updatedAt: cancelledAt })
      .where(
        and(
          eq(signatureRecipients.signatureRequestId, requestId),
          eq(signatureRecipients.userId, userId),
          ne(signatureRecipients.status, "SIGNED")
        )
      );

    await logSignatureEvent({
      userId,
      actorUserId,
      signatureRequestId: requestId,
      type: "cancelled",
    }, tx);

    await logActivity({
      userId,
      actorUserId,
      entityType: "signature_request",
      entityId: requestId,
      action: "cancelled",
      previousValue: { status: request.status },
      newValue: { status: "CANCELLED", cancelledAt },
    }, tx);

    revalidateSignaturePaths(request);
    return { success: true };
  });
}

export async function deleteSignatureRequest(requestId: string) {
  const { ownerUserId: userId, actorUserId } = await requireAdminAccess();
  return withSignatureRequestLock(requestId, async (tx) => {
    const request = await getOwnedSignatureRequest(requestId, userId, tx);
    if (!request) return { error: "Solicitud no encontrada" };

    await logActivity({
      userId,
      actorUserId,
      entityType: "signature_request",
      entityId: requestId,
      action: "deleted",
      previousValue: {
        status: request.status,
        subject: request.subject,
        recipientEmail: request.recipientEmail,
      },
    }, tx);

    await tx.delete(signatureRequests).where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.userId, userId)));

    revalidateSignaturePaths(request);
    return { success: true };
  });
}

export async function downloadSignedDocument(requestId: string) {
  const { ownerUserId: userId, actorUserId } = await getWorkspaceAccess();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request) return { error: "Solicitud no encontrada" };
  if (!request.document?.signedStoragePath) return { error: "El PDF firmado todavia no esta disponible" };
  if (!isSignatureStoragePath(request.document.signedStoragePath, { userId, requestId: request.id })) {
    return { error: "Archivo no disponible" };
  }

  await logSignatureEvent({
    userId,
    actorUserId,
    signatureRequestId: requestId,
    type: "downloaded",
    metadata: { artifact: "signed-document" },
  });

  await logActivity({
    userId,
    actorUserId,
    entityType: "document",
    entityId: request.document.id,
    action: "downloaded",
    newValue: { signatureRequestId: requestId },
  });

  revalidateSignaturePaths(request);
  return { success: true, storagePath: request.document.signedStoragePath };
}

export async function getSignatureOriginalDocumentUrl(requestId: string) {
  const { ownerUserId: userId } = await getWorkspaceAccess();
  const request = await getOwnedSignatureRequest(requestId, userId);
  if (!request?.document) return null;
  if (!isSignatureStoragePath(request.document.originalStoragePath, { userId, requestId: request.id })) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(request.document.originalStoragePath, 60 * 10);

  if (error) return null;
  return data.signedUrl;
}
