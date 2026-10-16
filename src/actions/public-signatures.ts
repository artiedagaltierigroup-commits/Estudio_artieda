"use server";

import { createHash, randomBytes } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { signatureDocuments, signatureEvents, signatureRecipients, signatureRequests } from "../db/schema";
import { shouldOfferSavedSignature } from "../lib/client-saved-signatures";
import { buildSignatureStoragePath, hashBufferSha256, SIGNATURE_BUCKET } from "../lib/signature-files";
import { buildSignedDocumentCopyEmail, sendSignatureRequestEmail } from "../lib/signature-email";
import { decodeSignaturePng } from "../lib/signature-image";
import { embedRecipientSignaturesInPdf } from "../lib/signature-pdf";
import { getAggregateSignatureStatus } from "../lib/signature-recipients";
import { ACTIVE_SIGNATURE_RECIPIENT_STATUSES, withSignatureRequestLock, type SignatureTransaction } from "../lib/signature-transaction";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { logActivity } from "../lib/activity-log";
import { assertSignatureStoragePath, isOwnedSignatureRequestGraph } from "../lib/signature-storage-scope";

type PublicSignatureEventType = "link_opened" | "signing_started" | "signing_interrupted";
const PUBLIC_EVENTS: readonly string[] = ["link_opened", "signing_started", "signing_interrupted"];

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function isTerminalRecipientStatus(status: string) { return ["SIGNED", "EXPIRED", "CANCELLED"].includes(status); }
function isTerminalRequestStatus(status: string) { return ["SIGNED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status); }
function isRecipientExpired(recipient: { tokenExpiresAt: Date }) { return recipient.tokenExpiresAt.getTime() < Date.now(); }
function getRecipientDisplayName(recipient: { firstName: string; lastName: string; fullName: string | null; email: string }) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

async function getRecipientByToken(token: string, executor: typeof db | SignatureTransaction = db) {
  if (typeof token !== "string" || !token || token.length > 256) return undefined;
  const recipient = await executor.query.signatureRecipients.findFirst({
    where: (item, { eq: equals }) => equals(item.tokenHash, hashToken(token)),
    with: {
      client: { with: { savedSignature: true } },
      request: { with: {
        document: true,
        recipients: { orderBy: (recipient, { asc }) => [asc(recipient.sortOrder)], with: { placements: true } },
      } },
      placements: true,
    },
  });
  if (!recipient || recipient.signatureRequestId !== recipient.request.id ||
      !isOwnedSignatureRequestGraph(recipient.request, recipient.userId) ||
      (recipient.client && (recipient.client.userId !== recipient.userId ||
        (recipient.client.savedSignature && (recipient.client.savedSignature.userId !== recipient.userId ||
          recipient.client.savedSignature.clientId !== recipient.client.id))))) return undefined;
  return recipient;
}
type PublicRecipient = NonNullable<Awaited<ReturnType<typeof getRecipientByToken>>>;

async function updateRequestAggregateStatus(tx: SignatureTransaction, requestId: string, signedAt?: Date) {
  const request = await tx.query.signatureRequests.findFirst({ where: eq(signatureRequests.id, requestId) });
  if (!request) throw new Error("Solicitud no encontrada");
  if (isTerminalRequestStatus(request.status)) return request.status;
  const recipients = await tx.query.signatureRecipients.findMany({ where: eq(signatureRecipients.signatureRequestId, requestId) });
  const status = getAggregateSignatureStatus(recipients);
  await tx.update(signatureRequests).set({
    status, ...(status === "SIGNED" ? { signedAt: request.signedAt ?? signedAt ?? new Date() } : {}), updatedAt: new Date(),
  }).where(eq(signatureRequests.id, requestId));
  return status;
}

async function expirePublicRecipient(tx: SignatureTransaction, recipient: PublicRecipient) {
  if (isTerminalRecipientStatus(recipient.status) || isTerminalRequestStatus(recipient.request.status) || !isRecipientExpired(recipient)) return;
  const updated = await tx.update(signatureRecipients).set({ status: "EXPIRED", updatedAt: new Date() }).where(and(
    eq(signatureRecipients.id, recipient.id),
    eq(signatureRecipients.tokenHash, recipient.tokenHash),
    inArray(signatureRecipients.status, [...ACTIVE_SIGNATURE_RECIPIENT_STATUSES]),
  )).returning({ id: signatureRecipients.id });
  if (!updated.length) return;
  await tx.insert(signatureEvents).values({
    userId: recipient.userId, signatureRequestId: recipient.signatureRequestId, signatureRecipientId: recipient.id,
    type: "expired", metadata: { tokenExpiresAt: recipient.tokenExpiresAt },
  });
  await updateRequestAggregateStatus(tx, recipient.signatureRequestId);
}

async function getRequestHeaders() {
  const store = await headers();
  return { ipAddress: store.get("x-forwarded-for")?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? null, userAgent: store.get("user-agent") };
}

export async function getPublicSignatureRequest(token: string) {
  let recipient = await getRecipientByToken(token);
  if (!recipient) return { error: "Solicitud no encontrada" };
  if (isRecipientExpired(recipient) && !isTerminalRecipientStatus(recipient.status) && !isTerminalRequestStatus(recipient.request.status)) {
    recipient = await withSignatureRequestLock(recipient.signatureRequestId, async (tx) => {
      const current = await getRecipientByToken(token, tx);
      if (current) await expirePublicRecipient(tx, current);
      return getRecipientByToken(token, tx);
    });
    if (!recipient) return { error: "Solicitud no encontrada" };
  }
  if (recipient.request.status === "CANCELLED" || recipient.status === "CANCELLED") return { error: "Esta solicitud fue cancelada." };
  if (recipient.status === "EXPIRED" || (isRecipientExpired(recipient) && recipient.status !== "SIGNED")) {
    return { error: "Esta solicitud de firma vencio. Pedi al estudio que vuelva a enviarla." };
  }
  return { request: {
    id: recipient.request.id, subject: recipient.request.subject, message: recipient.request.message,
    status: recipient.request.status, recipientStatus: recipient.status, recipientName: getRecipientDisplayName(recipient),
    recipientEmail: recipient.email, tokenExpiresAt: recipient.tokenExpiresAt,
    savedSignatureAvailable: shouldOfferSavedSignature({ clientId: recipient.clientId, savedSignatureId: recipient.client?.savedSignature?.id ?? null }),
    canSaveSignatureForClient: Boolean(recipient.clientId),
  } };
}

export async function trackPublicSignatureEvent(token: string, eventType: PublicSignatureEventType) {
  if (!PUBLIC_EVENTS.includes(eventType)) return { error: "Evento no permitido" };
  const candidate = await getRecipientByToken(token);
  if (!candidate) return { error: "Solicitud no encontrada" };
  const headerData = await getRequestHeaders();
  const result = await withSignatureRequestLock(candidate.signatureRequestId, async (tx) => {
    const recipient = await getRecipientByToken(token, tx);
    if (!recipient) return { error: "Solicitud no encontrada" };
    if (isTerminalRecipientStatus(recipient.status) || isTerminalRequestStatus(recipient.request.status)) return { success: true };
    if (isRecipientExpired(recipient)) { await expirePublicRecipient(tx, recipient); return { error: "Esta solicitud vencio." }; }
    const statusByEvent = { link_opened: "LINK_OPENED", signing_started: "SIGNING_STARTED", signing_interrupted: "SIGNING_INTERRUPTED" } as const;
    const changed = await tx.update(signatureRecipients).set({ status: statusByEvent[eventType], updatedAt: new Date() }).where(and(
      eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.tokenHash, hashToken(token)),
      inArray(signatureRecipients.status, [...ACTIVE_SIGNATURE_RECIPIENT_STATUSES]),
    )).returning({ id: signatureRecipients.id });
    if (!changed.length) return { error: "Esta solicitud no esta disponible para firmar." };
    await tx.insert(signatureEvents).values({
      userId: recipient.userId, signatureRequestId: recipient.signatureRequestId, signatureRecipientId: recipient.id,
      type: eventType, ...headerData,
    });
    await updateRequestAggregateStatus(tx, recipient.signatureRequestId);
    return { success: true };
  });
  revalidatePath(`/firmas/${candidate.signatureRequestId}`);
  return result;
}

async function prepareSignedPdf(recipient: PublicRecipient, signatureBytes: Buffer, signedAt: Date) {
  const document = recipient.request.document;
  if (!document || document.userId !== recipient.userId) throw new Error("Documento no encontrado");
  const scope = { userId: recipient.userId, requestId: recipient.request.id };
  assertSignatureStoragePath(document.originalStoragePath, scope);
  for (const accepted of recipient.request.recipients.filter((item) => item.status === "SIGNED")) {
    assertSignatureStoragePath(accepted.signatureStoragePath, scope);
  }
  const storage = createSupabaseAdminClient().storage.from(SIGNATURE_BUCKET);
  const original = await storage.download(document.originalStoragePath);
  if (original.error || !original.data) throw new Error("No se pudo leer el documento original");
  const originalBytes = Buffer.from(await original.data.arrayBuffer());
  if (await hashBufferSha256(originalBytes) !== document.originalSha256) throw new Error("El documento original cambio");
  const accepted = recipient.request.recipients.filter((item) => item.status === "SIGNED" || item.id === recipient.id);
  const inputs = [];
  for (const item of accepted) {
    if (item.userId !== recipient.userId || !item.placements.length || item.placements.some((placement) => placement.userId !== recipient.userId || placement.signatureRequestId !== recipient.signatureRequestId)) {
      throw new Error("La ubicacion de firma no es valida");
    }
    let png = signatureBytes;
    if (item.id !== recipient.id) {
      if (!item.signatureStoragePath || !item.signatureSha256 || !item.signedAt) throw new Error("Falta una firma aceptada");
      const stored = await storage.download(item.signatureStoragePath);
      if (stored.error || !stored.data) throw new Error("No se pudo leer una firma aceptada");
      png = Buffer.from(await stored.data.arrayBuffer());
      if (await hashBufferSha256(png) !== item.signatureSha256) throw new Error("Una firma aceptada cambio");
    }
    inputs.push({ signerName: getRecipientDisplayName(item), signedAt: item.signedAt ?? signedAt, signaturePngBytes: png,
      placements: item.placements.map((placement) => ({ pageNumber: placement.pageNumber, x: Number(placement.placementX), y: Number(placement.placementY), width: Number(placement.placementWidth), height: Number(placement.placementHeight) })),
    });
  }
  return { signed: await embedRecipientSignaturesInPdf({ originalPdfBytes: originalBytes, recipients: inputs }), allSigned: accepted.length === recipient.request.recipients.length };
}

export async function submitPublicSignature(token: string, formData: FormData) {
  const candidate = await getRecipientByToken(token);
  if (!candidate) return { error: "Solicitud no encontrada" };
  let signatureBytes: Buffer;
  try { signatureBytes = await decodeSignaturePng(String(formData.get("signatureDataUrl") ?? "")); }
  catch { return { error: "La firma no es una imagen PNG valida o supera el tamaño permitido. Dibujala nuevamente." }; }
  const headerData = await getRequestHeaders();
  let completed = false;
  let warning: string | undefined;
  let result;
  try {
    result = await withSignatureRequestLock(candidate.signatureRequestId, async (tx) => {
      const recipient = await getRecipientByToken(token, tx);
      if (!recipient) return { error: "Solicitud no encontrada" };
      if (recipient.status === "SIGNED") return { success: true, requestId: recipient.signatureRequestId };
      if (isTerminalRequestStatus(recipient.request.status) || isTerminalRecipientStatus(recipient.status) ||
          !ACTIVE_SIGNATURE_RECIPIENT_STATUSES.includes(recipient.status as typeof ACTIVE_SIGNATURE_RECIPIENT_STATUSES[number])) {
        return { error: "Esta solicitud ya no puede firmarse." };
      }
      if (isRecipientExpired(recipient)) { await expirePublicRecipient(tx, recipient); return { error: "Esta solicitud vencio." }; }
      if (recipient.userId !== recipient.request.userId) return { error: "Solicitud no encontrada" };
      const signedAt = new Date();
      const signatureSha256 = await hashBufferSha256(signatureBytes);
      // Always render from the immutable original, before any acceptance is committed.
      const { signed, allSigned } = await prepareSignedPdf(recipient, signatureBytes, signedAt);
      const signatureStoragePath = buildSignatureStoragePath({ userId: recipient.userId, requestId: recipient.signatureRequestId,
        kind: "signature", fileName: `firma-${recipient.id}-${signatureSha256}.png` });
      const storage = createSupabaseAdminClient().storage.from(SIGNATURE_BUCKET);
      const uploaded = await storage.upload(signatureStoragePath, signatureBytes, { contentType: "image/png", upsert: true });
      if (uploaded.error) throw new Error("No se pudo guardar la firma");
      if (allSigned) {
        const signedStoragePath = buildSignatureStoragePath({ userId: recipient.userId, requestId: recipient.signatureRequestId,
          kind: "signed", fileName: `${signed.signedSha256}-${recipient.request.document!.originalFileName}` });
        const finalUpload = await storage.upload(signedStoragePath, Buffer.from(signed.signedPdfBytes), { contentType: "application/pdf", upsert: true });
        if (finalUpload.error) throw new Error("No se pudo guardar el PDF firmado");
        const firstRecipient = recipient.request.recipients[0];
        await tx.update(signatureDocuments).set({ signedStoragePath, signedSha256: signed.signedSha256,
          signatureStoragePath: firstRecipient.id === recipient.id ? signatureStoragePath : firstRecipient.signatureStoragePath,
          signatureSha256: firstRecipient.id === recipient.id ? signatureSha256 : firstRecipient.signatureSha256,
          updatedAt: signedAt }).where(and(
          eq(signatureDocuments.id, recipient.request.document!.id), eq(signatureDocuments.userId, recipient.userId),
          eq(signatureDocuments.originalSha256, recipient.request.document!.originalSha256),
        ));
      }
      const changed = await tx.update(signatureRecipients).set({ status: "SIGNED", signedAt, signatureStoragePath, signatureSha256, updatedAt: signedAt }).where(and(
        eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.tokenHash, hashToken(token)),
        inArray(signatureRecipients.status, [...ACTIVE_SIGNATURE_RECIPIENT_STATUSES]),
      )).returning({ id: signatureRecipients.id });
      if (!changed.length) throw new Error("La solicitud cambio mientras se firmaba");
      const aggregateStatus = await updateRequestAggregateStatus(tx, recipient.signatureRequestId, signedAt);
      await tx.insert(signatureEvents).values({ userId: recipient.userId, signatureRequestId: recipient.signatureRequestId,
        signatureRecipientId: recipient.id, type: "signed", ...headerData,
        metadata: { signatureSha256, documentSha256: recipient.request.document!.originalSha256, aggregateStatus },
      });
      completed = allSigned;
      return { success: true, requestId: recipient.signatureRequestId };
    });
  } catch {
    return { error: "No se pudo completar la firma. El documento sigue disponible para volver a intentar." };
  }
  if (completed) {
    try { await sendSignedDocumentCopiesToRecipients(candidate.signatureRequestId); }
    catch {
      warning = "Tu firma y el PDF se guardaron. No se pudo enviar la copia por correo; el estudio puede descargar el documento firmado.";
      // Null delivery timestamps remain the durable pending marker; acceptance is never rolled back for email.
      try {
        await logActivity({ userId: candidate.userId, entityType: "signature_request", entityId: candidate.signatureRequestId,
          action: "updated", note: "Envio de copia final pendiente; el PDF firmado esta disponible para descarga.",
          newValue: { signedCopyDelivery: "PENDING" },
        });
      } catch { console.warn("Could not record pending signed-copy delivery"); }
    }
  }
  revalidatePath(`/firmas/${candidate.signatureRequestId}`);
  return { ...result, warning };
}

async function sendSignedDocumentCopiesToRecipients(requestId: string) {
  const request = await db.query.signatureRequests.findFirst({ where: eq(signatureRequests.id, requestId), with: { document: true, recipients: true } });
  if (!request?.sendSignedCopyToRecipients || request.signedCopySentAt || !request.document?.signedStoragePath) return;
  const now = new Date(); const expiresAt = new Date(now.getTime() + 30 * 86400000);
  for (const recipient of request.recipients) {
    if (recipient.signedCopySentAt) continue;
    const token = randomBytes(32).toString("hex");
    await db.update(signatureRecipients).set({ signedCopyTokenHash: hashToken(token), signedCopyTokenExpiresAt: expiresAt, updatedAt: now }).where(eq(signatureRecipients.id, recipient.id));
    await sendSignatureRequestEmail(buildSignedDocumentCopyEmail({ recipientEmail: recipient.email, subject: request.subject, token }));
    await db.update(signatureRecipients).set({ signedCopySentAt: now, updatedAt: now }).where(eq(signatureRecipients.id, recipient.id));
  }
  await db.update(signatureRequests).set({ signedCopySentAt: now, updatedAt: now }).where(eq(signatureRequests.id, requestId));
}
