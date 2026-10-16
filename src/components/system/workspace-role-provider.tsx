"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceRole } from "@/lib/workspace-permissions";

// This context controls presentation only. Server actions authorize every request independently.
const WorkspaceRoleContext = createContext<WorkspaceRole>("COLLABORATOR");

export function WorkspaceRoleProvider({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  return <WorkspaceRoleContext.Provider value={role}>{children}</WorkspaceRoleContext.Provider>;
}

export function useWorkspaceRole() {
  return useContext(WorkspaceRoleContext);
}
