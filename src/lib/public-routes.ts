const publicPathPrefixes = [
  "/firmar",
  "/api/signatures/email-open",
  "/api/signatures/final-copy",
];

export function isPublicRoutePath(pathname: string) {
  // These exact handlers authenticate the scheduler with CRON_SECRET.
  if (pathname === "/api/cron/signatures" || pathname === "/api/cron/recurring-expenses") return true;
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
