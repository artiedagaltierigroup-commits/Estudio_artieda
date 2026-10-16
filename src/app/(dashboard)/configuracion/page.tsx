import { HelpCenterView } from "@/components/help/help-center-view";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { OperationalHelp } from "@/components/operational/workspace-pages";

export default async function ConfiguracionPage() {
  const access = await getWorkspaceAccess();
  if (access.role === "COLLABORATOR") return <OperationalHelp />;
  return <HelpCenterView />;
}
