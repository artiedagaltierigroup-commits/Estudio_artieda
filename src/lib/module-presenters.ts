import type { VisualTone } from "./presentation";

export function getReminderPriorityTone(priority: string): VisualTone {
  switch (priority) {
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "amber";
    case "LOW":
    default:
      return "slate";
  }
}

export function getCalendarEventLabel(type: string): string {
  const labels: Record<string, string> = {
    charge: "Cobro",
    reminder: "Recordatorio",
    expense: "Gasto",
    recurring: "Recurrente",
  };

  return labels[type] ?? type;
}

export function getCalendarEventTone(type: string): VisualTone {
  switch (type) {
    case "charge":
      return "lilac";
    case "reminder":
      return "amber";
    case "expense":
      return "danger";
    case "recurring":
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
  };

  return labels[entityType] ?? entityType;
}
