export type ReminderPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ReminderMutationInput {
  caseId?: string | null;
  clientId?: string | null;
  title: string;
  description?: string;
  reminderDate: string;
  priority: ReminderPriority;
}

function normalizeOptionalRelation(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeReminderMutationInput(input: ReminderMutationInput) {
  return {
    ...input,
    caseId: normalizeOptionalRelation(input.caseId),
    clientId: normalizeOptionalRelation(input.clientId),
    reminderDate: new Date(input.reminderDate),
  };
}
