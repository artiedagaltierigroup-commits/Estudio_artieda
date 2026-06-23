const publicPathPrefixes = [
  "/firmar",
  "/api/signatures/email-open",
  "/api/signatures/final-copy",
];

export function isPublicRoutePath(pathname: string) {
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
