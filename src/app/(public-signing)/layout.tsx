import type { ReactNode } from "react";

export default function PublicSigningLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffafa,#f8eef2)] px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
