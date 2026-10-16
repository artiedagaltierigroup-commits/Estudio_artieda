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
  // datetime-local has no offset. The office uses Argentina time, independently
  // of the deployment host's UTC timezone; explicit ISO offsets stay intact.
  const reminderDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(input.reminderDate)
    ? `${input.reminderDate}-03:00` : input.reminderDate;
  return {
    ...input,
    caseId: normalizeOptionalRelation(input.caseId),
    clientId: normalizeOptionalRelation(input.clientId),
    reminderDate: new Date(reminderDate),
  };
}
