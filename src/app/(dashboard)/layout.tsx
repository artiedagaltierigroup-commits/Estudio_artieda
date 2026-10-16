import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AccessDenied } from "@/components/system/access-denied";
import { getWorkspaceAccess, WorkspaceAccessError } from "@/lib/workspace-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let access;
  try {
    access = await getWorkspaceAccess();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      if (error.code === "ACCESS_DENIED") return <AccessDenied />;
    }
    throw error;
  }

  return (
    <DashboardShell email={access.email} role={access.role}>{children}</DashboardShell>
  );
}
