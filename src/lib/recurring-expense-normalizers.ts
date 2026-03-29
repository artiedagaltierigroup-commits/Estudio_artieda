import { format, parseISO } from "date-fns";

import type { recurringExpenses } from "@/db/schema";

type RecurringExpenseMode = "AUTOMATIC" | "PAYABLE";

const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

type ExistingRecurringExpense = Pick<typeof recurringExpenses.$inferSelect, "mode" | "startDate" | "createdAt">;

interface ResolveRecurringStartDateInput {
  mode: RecurringExpenseMode;
  existingMode?: RecurringExpenseMode;
  existingStartDate?: string | null;
  submittedStartDate?: string | null;
  createdAt?: string | Date | null;
  today?: Date;
}

function formatInAppTimeZone(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function resolveRecurringStartDate(input: ResolveRecurringStartDateInput): string {
  if (input.mode === "AUTOMATIC") {
    return input.submittedStartDate?.trim() ?? format(input.today ?? new Date(), "yyyy-MM-dd");
  }

  if (input.existingMode === "PAYABLE" && input.existingStartDate?.trim()) {
    return input.existingStartDate.trim();
  }

  if (input.createdAt) {
    const createdDate = typeof input.createdAt === "string" ? parseISO(input.createdAt) : input.createdAt;
    return formatInAppTimeZone(createdDate);
  }

  return formatInAppTimeZone(input.today ?? new Date());
}

export function resolveExistingRecurringStartDate(
  existing: ExistingRecurringExpense | null,
  mode: RecurringExpenseMode,
  submittedStartDate?: string | null,
  today?: Date
): string {
  return resolveRecurringStartDate({
    mode,
    existingMode: existing?.mode,
    existingStartDate: existing?.startDate,
    submittedStartDate,
    createdAt: existing?.createdAt ?? null,
    today,
  });
}
