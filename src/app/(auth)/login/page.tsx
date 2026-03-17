"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Credenciales incorrectas. Verifica tu email y contrasena.");
      setLoading(false);
      return;
    }

    if (!rememberMe) {
      toast.message("La sesion quedara disponible en este dispositivo hasta cerrar manualmente.");
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(232,154,180,0.28),_transparent_32%),linear-gradient(180deg,_#fff8fb_0%,_#fffdfd_45%,_#f9f3f6_100%)] p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden rounded-[32px] border border-white/60 bg-white/75 p-10 shadow-[0_30px_80px_-45px_rgba(137,92,111,0.5)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary shadow-sm">
                <Scale className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary/80">Estudio Artieda</p>
              <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-foreground">
                Gestion personal, clara y elegante para el trabajo diario.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Base tecnica lista para clientes, casos, cobros, gastos y recordatorios internos sin depender de una
                infraestructura compleja.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Auth</p>
                <p className="mt-2 text-sm font-medium text-foreground">Supabase con acceso privado</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">DB</p>
                <p className="mt-2 text-sm font-medium text-foreground">Drizzle sobre Postgres de Supabase</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shell</p>
                <p className="mt-2 text-sm font-medium text-foreground">Dashboard listo para crecer por modulos</p>
              </div>
            </div>
          </section>

          <div className="flex items-center">
            <Card className="w-full">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Iniciar sesion</CardTitle>
                  <CardDescription>
                    Acceso privado para la unica usuaria inicial del sistema.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electronico</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="abogada@estudio.cl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contrasena</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Checkbox
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                        aria-label="Recordarme en este dispositivo"
                      />
                      Recordarme en este dispositivo
                    </label>
                    <span className="text-xs text-muted-foreground">Recuperacion opcional en fase posterior</span>
                  </div>

                  <Button id="btn-login" type="submit" disabled={loading} className="w-full">
                    {loading ? "Ingresando..." : "Ingresar"}
                  </Button>

                  <p className="text-center text-xs leading-5 text-muted-foreground">
                    La autenticacion usa Supabase y el acceso publico permanece deshabilitado.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
