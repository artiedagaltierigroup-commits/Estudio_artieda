import type { VisualTone } from "@/lib/presentation";

export type SignatureRequestStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "EMAIL_OPENED"
  | "LINK_OPENED"
  | "DOCUMENT_VIEWED"
  | "SIGNING_STARTED"
  | "SIGNING_INTERRUPTED"
  | "PARTIALLY_SIGNED"
  | "SIGNED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export function getSignatureStatusLabel(status: SignatureRequestStatus) {
  const labels: Record<SignatureRequestStatus, string> = {
    DRAFT: "Borrador",
    READY: "Lista para enviar",
    SENT: "Enviada",
    EMAIL_OPENED: "Correo abierto",
    LINK_OPENED: "Link abierto",
    DOCUMENT_VIEWED: "Documento visto",
    SIGNING_STARTED: "Firma iniciada",
    SIGNING_INTERRUPTED: "Firma interrumpida",
    PARTIALLY_SIGNED: "Parcialmente firmada",
    SIGNED: "Firmada",
    REJECTED: "Rechazada",
    EXPIRED: "Vencida",
    CANCELLED: "Cancelada",
  };

  return labels[status];
}

export function getSignatureStatusTone(status: SignatureRequestStatus): VisualTone {
  if (status === "SIGNED") return "sage";
  if (status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED") return "danger";
  if (status === "PARTIALLY_SIGNED" || status === "SIGNING_INTERRUPTED" || status === "READY") return "amber";
  if (status === "SENT" || status === "EMAIL_OPENED" || status === "LINK_OPENED" || status === "DOCUMENT_VIEWED") {
    return "lilac";
  }

  return "slate";
}
