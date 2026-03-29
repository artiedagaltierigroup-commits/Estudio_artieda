import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeMoneyValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value).toString() : "";
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^-?\d+[.,]\d{1,2}$/.test(trimmed)) {
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed).toString() : "";
  }

  return trimmed.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function formatMoneyInput(value: number | string | null | undefined): string {
  const normalized = normalizeMoneyValue(value);
  if (!normalized) return "";

  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number(normalized));
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(numericValue);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";

  try {
    return format(parseISO(dateStr), "dd MMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";

  try {
    const dateValue = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    return format(dateValue, "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    return String(dateStr);
  }
}

export function getChargeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    PAID: "Pagado",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
  };

  return labels[status] ?? status;
}

export function getCaseStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    CLOSED: "Cerrado",
    SUSPENDED: "Suspendido",
  };

  return labels[status] ?? status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
  };

  return labels[priority] ?? priority;
}

export function getExpenseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    OPERATIVE: "Operativo",
    TAX: "Impuesto",
    SERVICE: "Servicio",
    OTHER: "Otro",
  };

  return labels[type] ?? type;
}

export function getFrequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    monthly: "Mensual",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    yearly: "Anual",
  };

  return labels[freq] ?? freq;
}

export function getRecurringModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    AUTOMATIC: "Gasto programado",
    PAYABLE: "Gasto por pagar",
  };

  return labels[mode] ?? mode;
}

export function getExpenseOriginLabel(origin: string): string {
  const labels: Record<string, string> = {
    MANUAL: "Manual",
    RECURRING_AUTOMATIC: "Programado",
    RECURRING_PAYABLE: "Por pagar",
  };

  return labels[origin] ?? origin;
}

export function deriveChargeStatus(
  amountTotal: string,
  amountPaid: string,
  dueDate: string | null,
  cancelledAt?: string | Date | null
): "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" {
  const total = parseFloat(amountTotal);
  const paid = parseFloat(amountPaid);
  const balance = total - paid;

  if (cancelledAt) return "CANCELLED";
  if (balance <= 0) return "PAID";
  if (dueDate && new Date(dueDate) < new Date()) return "OVERDUE";
  if (paid > 0) return "PARTIAL";
  return "PENDING";
}
