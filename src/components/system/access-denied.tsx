"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    setPending(true);
    setError(false);
    try {
      const result = await createClient().auth.signOut();
      if (result.error) throw result.error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="max-w-md space-y-5 rounded-[32px] border bg-card p-8">
        <h1 className="text-2xl font-semibold">Acceso pendiente</h1>
        <p className="text-muted-foreground">Tu cuenta todavía no tiene acceso al estudio. Contactá a la administradora para habilitarla.</p>
        {error ? <p role="alert">No se pudo cerrar la sesión. Volvé a intentarlo.</p> : null}
        <Button onClick={logout} disabled={pending}>{pending ? "Cerrando sesión..." : "Cerrar sesión"}</Button>
      </section>
    </main>
  );
}
