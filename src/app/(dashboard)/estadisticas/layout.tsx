import { redirect } from "next/navigation";
import { getWorkspaceAccess, WorkspaceAccessError } from "@/lib/workspace-access";

export default async function AdministratorLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getWorkspaceAccess();
    if (access.role !== "ADMIN") redirect("/");
  } catch (error) {
    if (error instanceof WorkspaceAccessError) redirect(error.code === "UNAUTHENTICATED" ? "/login" : "/");
    throw error;
  }
  return children;
}
