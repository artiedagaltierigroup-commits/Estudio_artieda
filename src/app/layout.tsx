import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Estudio Artieda | Gestion juridica personal",
  description: "Sistema web personal para clientes, casos, cobros, gastos y recordatorios internos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={plusJakartaSans.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
