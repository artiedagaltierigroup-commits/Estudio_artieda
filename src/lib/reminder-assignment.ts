import type { WorkspaceRole } from "./workspace-permissions";

type AssignmentAccess = {
  actorUserId: string;
  ownerUserId: string;
  role: WorkspaceRole;
};

type ReminderScope = {
  userId: string;
  createdByUserId: string | null;
  assigneeUserId: string | null;
};

export function resolveReminderAssignee(
  access: AssignmentAccess,
  requestedAssigneeId: string | null | undefined,
  enabledAssistantIds: readonly string[],
) {
  if (access.role === "COLLABORATOR") {
    if (!enabledAssistantIds.includes(access.actorUserId)) throw new Error("INVALID_ASSIGNEE");
    if (requestedAssigneeId === undefined || requestedAssigneeId === access.actorUserId) return access.actorUserId;
    if (requestedAssigneeId === null || requestedAssigneeId === access.ownerUserId) return null;
    throw new Error("ASSIGNMENT_FORBIDDEN");
  }

  if (!requestedAssigneeId) return null;
  if (!enabledAssistantIds.includes(requestedAssigneeId)) throw new Error("INVALID_ASSIGNEE");
  return requestedAssigneeId;
}

export function canAccessReminder(access: AssignmentAccess, reminder: ReminderScope) {
  if (reminder.userId !== access.ownerUserId) return false;
  return access.role === "ADMIN" ||
    reminder.createdByUserId === access.actorUserId ||
    reminder.assigneeUserId === access.actorUserId;
}
