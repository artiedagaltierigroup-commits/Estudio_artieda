export type WorkspaceRole = "ADMIN" | "COLLABORATOR";

const sharedPaths = ["/clientes", "/casos", "/recordatorios", "/firmas", "/calendario", "/configuracion"];

export function canAccessWorkspacePath(role: WorkspaceRole, pathname: string) {
  if (role === "ADMIN") return true;
  if (role !== "COLLABORATOR") return false;
  return pathname === "/" || sharedPaths.some(path => pathname === path || pathname.startsWith(path + "/"));
}
