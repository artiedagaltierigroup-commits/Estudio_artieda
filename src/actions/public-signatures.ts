"use server";

import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { signatureEvents, signatureRecipients, signatureRequests } from "../db/schema";
import { shouldOfferSavedSignature } from "../lib/client-saved-signatures";
import { buildSignatureStoragePath, hashBufferSha256, SIGNATURE_BUCKET } from "../lib/signature-files";
import { getAggregateSignatureStatus } from "../lib/signature-recipients";
import { createClient } from "../lib/supabase/server";

type PublicSignatureEventType = "link_opened" | "signing_started" | "signing_interrupted" | "signed";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isTerminalRecipientStatus(status: string) {
  return ["SIGNED", "EXPIRED", "CANCELLED"].includes(status);
}

function isTerminalRequestStatus(status: string) {
  return ["SIGNED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status);
}

function isRecipientExpired(recipient: { tokenExpiresAt: Date }) {
  return recipient.tokenExpiresAt.getTime() < Date.now();
}

function decodeDataUrl(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

function getRecipientDisplayName(recipient: { firstName: string; lastName: string; fullName: string | null; email: string }) {
  return recipient.fullName ?? ([recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email);
}

async function getRecipientByToken(token: string) {
  return db.query.signatureRecipients.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.tokenHash, hashToken(token)),
    with: {
      client: {
        with: {
          savedSignature: true,
        },
      },
      request: {
        with: {
          recipients: {
            orderBy: (recipient, { asc }) => [asc(recipient.sortOrder)],
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
}

async function getRequestHeaders() {
  const headerStore = await headers();
  return {
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? null,
    userAgent: headerStore.get("user-agent"),
  };
}

async function updateRequestAggregateStatus(requestId: string, signedAt?: Date) {
  const recipients = await db.query.signatureRecipients.findMany({
    where: (recipient, { eq: eqOperator }) => eqOperator(recipient.signatureRequestId, requestId),
  });
  const status = getAggregateSignatureStatus(recipients);
  const nextSignedAt = status === "SIGNED" ? signedAt ?? new Date() : null;

  await db
    .update(signatureRequests)
    .set({
      status,
      signedAt: nextSignedAt,
      updatedAt: new Date(),
    })
    .where(eq(signatureRequests.id, requestId));

  return status;
}

async function createPublicEvent(params: {
  token: string;
  type: PublicSignatureEventType | "expired";
  metadata?: Record<string, unknown>;
}) {
  const recipient = await getRecipientByToken(params.token);
  if (!recipient) return null;

  const headerData = await getRequestHeaders();
  await db.insert(signatureEvents).values({
    userId: recipient.userId,
    signatureRequestId: recipient.signatureRequestId,
    signatureRecipientId: recipient.id,
    type: params.type,
    metadata: params.metadata ?? null,
    ipAddress: headerData.ipAddress,
    userAgent: headerData.userAgent,
  });

  return recipient;
}

async function expirePublicRecipient(recipient: NonNullable<Awaited<ReturnType<typeof getRecipientByToken>>>) {
  const now = new Date();
  await db
    .update(signatureRecipients)
    .set({ status: "EXPIRED", updatedAt: now })
    .where(eq(signatureRecipients.id, recipient.id));

  await db.insert(signatureEvents).values({
    userId: recipient.userId,
    signatureRequestId: recipient.signatureRequestId,
    signatureRecipientId: recipient.id,
    type: "expired",
    metadata: { tokenExpiresAt: recipient.tokenExpiresAt },
  });

  await updateRequestAggregateStatus(recipient.signatureRequestId);
}

export async function getPublicSignatureRequest(token: string) {
  const recipient = await getRecipientByToken(token);
  if (!recipient) return { error: "Solicitud no encontrada" };

  if (isRecipientExpired(recipient)) {
    await expirePublicRecipient(recipient);
    return { error: "Esta solicitud de firma vencio. Pedi al estudio que vuelva a enviarla." };
  }

  if (recipient.request.status === "CANCELLED") return { error: "Esta solicitud fue cancelada." };
  if (recipient.status === "CANCELLED") return { error: "Esta solicitud fue cancelada." };
  if (recipient.status === "EXPIRED") return { error: "Esta solicitud de firma vencio." };

  return {
    request: {
      id: recipient.request.id,
      subject: recipient.request.subject,
      message: recipient.request.message,
      status: recipient.request.status,
      recipientStatus: recipient.status,
      recipientName: getRecipientDisplayName(recipient),
      recipientEmail: recipient.email,
      tokenExpiresAt: recipient.tokenExpiresAt,
      savedSignatureAvailable: shouldOfferSavedSignature({
        clientId: recipient.clientId,
        savedSignatureId: recipient.client?.savedSignature?.id ?? null,
      }),
      canSaveSignatureForClient: Boolean(recipient.clientId),
    },
  };
}

export async function trackPublicSignatureEvent(token: string, eventType: PublicSignatureEventType) {
  const recipient = await createPublicEvent({ token, type: eventType });
  if (!recipient) return { error: "Solicitud no encontrada" };

  const statusByEvent: Partial<Record<PublicSignatureEventType, typeof signatureRecipients.$inferSelect.status>> = {
    link_opened: "LINK_OPENED",
    signing_started: "SIGNING_STARTED",
    signing_interrupted: "SIGNING_INTERRUPTED",
  };

  const nextStatus = statusByEvent[eventType];
  if (nextStatus && !isTerminalRecipientStatus(recipient.status) && !isTerminalRequestStatus(recipient.request.status)) {
    await db
      .update(signatureRecipients)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.tokenHash, hashToken(token))));

    await updateRequestAggregateStatus(recipient.signatureRequestId);
  }

  revalidatePath(`/firmas/${recipient.signatureRequestId}`);
  return { success: true };
}

export async function submitPublicSignature(token: string, formData: FormData) {
  const recipient = await getRecipientByToken(token);
  if (!recipient) return { error: "Solicitud no encontrada" };
  if (isTerminalRequestStatus(recipient.request.status) || isTerminalRecipientStatus(recipient.status)) {
    return { error: "Esta solicitud ya no puede firmarse." };
  }
  if (isRecipientExpired(recipient)) {
    await expirePublicRecipient(recipient);
    return { error: "Esta solicitud vencio." };
  }

  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "");
  if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
    return { error: "Dibuja una firma para continuar." };
  }

  const signatureBytes = decodeDataUrl(signatureDataUrl);
  const signedAt = new Date();
  const signatureSha256 = await hashBufferSha256(signatureBytes);
  const signatureStoragePath = buildSignatureStoragePath({
    userId: recipient.userId,
    requestId: recipient.signatureRequestId,
    kind: "signature",
    fileName: `firma-${recipient.id}.png`,
  });

  const supabase = await createClient();
  const signatureUpload = await supabase.storage.from(SIGNATURE_BUCKET).upload(signatureStoragePath, signatureBytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (signatureUpload.error) return { error: signatureUpload.error.message };

  await db
    .update(signatureRecipients)
    .set({
      status: "SIGNED",
      signedAt,
      signatureStoragePath,
      signatureSha256,
      updatedAt: signedAt,
    })
    .where(and(eq(signatureRecipients.id, recipient.id), eq(signatureRecipients.tokenHash, hashToken(token))));

  const aggregateStatus = await updateRequestAggregateStatus(recipient.signatureRequestId, signedAt);

  await createPublicEvent({
    token,
    type: "signed",
    metadata: {
      signatureSha256,
      aggregateStatus,
    },
  });

  revalidatePath(`/firmas/${recipient.signatureRequestId}`);
  return { success: true, requestId: recipient.signatureRequestId };
}
