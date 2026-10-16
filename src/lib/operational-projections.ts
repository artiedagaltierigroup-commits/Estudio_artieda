import "server-only";
import type { cases, clients, reminders } from "@/db/schema";

// Explicit allowlists keep future financial columns out of shared responses.
export const operationalClientColumns = {
  id: true, userId: true, name: true, taxId: true, email: true, phone: true,
  address: true, languages: true, notes: true, createdAt: true, updatedAt: true,
} as const;
export const operationalCaseColumns = {
  id: true, userId: true, clientId: true, title: true, description: true,
  status: true, priority: true, startDate: true, endDate: true,
  createdAt: true, updatedAt: true,
} as const;
export const operationalReminderColumns = {
  id: true, userId: true, createdByUserId: true, assigneeUserId: true,
  caseId: true, clientId: true, title: true,
  description: true, reminderDate: true, priority: true, completed: true,
  completedAt: true, createdAt: true, updatedAt: true,
} as const;

type OperationalClient = Pick<typeof clients.$inferSelect, keyof typeof operationalClientColumns>;
type OperationalCase = Pick<typeof cases.$inferSelect, keyof typeof operationalCaseColumns>;
type OperationalReminder = Pick<typeof reminders.$inferSelect, keyof typeof operationalReminderColumns>;

function pickColumns<T extends object, K extends keyof T>(row: T, columns: Record<K, true>): Pick<T, K> {
  const projected = {} as Pick<T, K>;
  for (const key of Object.keys(columns) as K[]) projected[key] = row[key];
  return projected;
}

export function projectOperationalClient(row: OperationalClient) {
  return pickColumns(row, operationalClientColumns);
}
export function projectOperationalCase(row: OperationalCase) {
  return pickColumns(row, operationalCaseColumns);
}
export function projectOperationalReminder(row: OperationalReminder) {
  return pickColumns(row, operationalReminderColumns);
}
