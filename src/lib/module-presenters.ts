import type { VisualTone } from "./presentation";

export function getReminderPriorityTone(priority: string): VisualTone {
  switch (priority) {
    case "HIGH":
      return "priority-high";
    case "MEDIUM":
      return "priority-medium";
    case "LOW":
    default:
      return "priority-low";
  }
}

export function getCalendarEventLabel(type: string): string {
  const labels: Record<string, string> = {
    charge: "Cobro",
    reminder: "Recordatorio",
    expense: "Gasto",
    recurring: "Recurrente",
    savings: "Ahorro",
  };

  return labels[type] ?? type;
}

export function getCalendarEventTone(type: string): VisualTone {
  switch (type) {
    case "charge":
      return "sage";
    case "reminder":
      return "amber";
    case "expense":
      return "danger";
    case "recurring":
      return "lilac";
    default:
      return "rose";
  }
}

export function getActivityActionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: "Creado",
    updated: "Modificado",
    deleted: "Eliminado",
    status_changed: "Estado cambiado",
    due_date_changed: "Vencimiento cambiado",
    sent: "Enviado",
    signed: "Firmado",
    resent: "Reenviado",
    cancelled: "Cancelado",
    downloaded: "Descargado",
  };

  return labels[action] ?? action;
}

export function getActivityEntityLabel(entityType: string): string {
  const labels: Record<string, string> = {
    case: "Caso",
    charge: "Cobro",
    payment: "Pago",
    expense: "Gasto",
    reminder: "Recordatorio",
    document: "Documento",
    savings_goal: "Ahorro",
    savings_contribution: "Aporte de ahorro",
    signature_request: "Solicitud de firma",
  };

  return labels[entityType] ?? entityType;
}

export function getClientPortfolioStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OVERDUE: "Con deuda vencida",
    ACTIVE: "Activo",
    FOLLOW_UP: "En seguimiento",
    IDLE: "Sin movimiento",
  };

  return labels[status] ?? status;
}

export function getClientPortfolioStatusTone(status: string): VisualTone {
  switch (status) {
    case "OVERDUE":
      return "danger";
    case "ACTIVE":
      return "sage";
    case "FOLLOW_UP":
      return "amber";
    case "IDLE":
    default:
      return "slate";
  }
}
