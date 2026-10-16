import "server-only";
import { db } from "@/db";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "./workspace-permissions";

export interface WorkspaceAccess {
  actorUserId: string;
  ownerUserId: string;
  displayName: string;
  role: WorkspaceRole;
  email?: string;
}

export class WorkspaceAccessError extends Error {
  readonly status: 401 | 403;
  constructor(readonly code: "UNAUTHENTICATED" | "ACCESS_DENIED") {
    super(code === "UNAUTHENTICATED" ? "No autenticado" : "No tienes permiso para acceder a esta información");
    this.name = "WorkspaceAccessError";
    this.status = code === "UNAUTHENTICATED" ? 401 : 403;
  }
}

// Resolve every operation from protected, current membership. Never trust metadata,
// a client-supplied owner/role, or a process-wide cached session.
export async function getWorkspaceAccess(): Promise<WorkspaceAccess> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new WorkspaceAccessError("UNAUTHENTICATED");

  const member = await db.query.workspaceMembers.findFirst({
    where: (row, { eq }) => eq(row.userId, user.id),
  });
  if (!member?.enabled || member.userId !== user.id || !member.ownerUserId || !member.displayName?.trim() ||
      (member.role !== "ADMIN" && member.role !== "COLLABORATOR")) {
    throw new WorkspaceAccessError("ACCESS_DENIED");
  }
  if (member.role === "ADMIN") {
    if (member.ownerUserId !== user.id) throw new WorkspaceAccessError("ACCESS_DENIED");
  } else {
    const owner = await db.query.workspaceMembers.findFirst({
      where: (row, { eq }) => eq(row.userId, member.ownerUserId),
    });
    if (!owner?.enabled || owner.role !== "ADMIN" || owner.userId !== member.ownerUserId || owner.ownerUserId !== owner.userId) {
      throw new WorkspaceAccessError("ACCESS_DENIED");
    }
  }
  return { actorUserId: user.id, ownerUserId: member.ownerUserId, displayName: member.displayName.trim(), role: member.role, email: user.email };
}

export async function requireAdminAccess(): Promise<WorkspaceAccess> {
  const access = await getWorkspaceAccess();
  if (access.role !== "ADMIN") throw new WorkspaceAccessError("ACCESS_DENIED");
  return access;
}
