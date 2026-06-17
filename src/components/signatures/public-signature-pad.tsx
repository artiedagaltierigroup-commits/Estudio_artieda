"use client";

import { submitPublicSignature, trackPublicSignatureEvent } from "@/actions/public-signatures";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import SignaturePad from "signature_pad";
import { Check, Eraser, PenLine } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface PublicSignaturePadProps {
  token: string;
  savedSignatureAvailable: boolean;
  canSaveSignatureForClient: boolean;
}

export function PublicSignaturePad({
  token,
  savedSignatureAvailable,
  canSaveSignatureForClient,
}: PublicSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [useSavedSignature, setUseSavedSignature] = useState(savedSignatureAvailable);
  const [saveForClient, setSaveForClient] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resizeCanvas() {
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
      setSignatureDataUrl("");
    }

    resizeCanvas();
    const pad = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: "#2f2529",
    });
    pad.addEventListener("beginStroke", () => {
      void trackPublicSignatureEvent(token, "signing_started");
    });
    pad.addEventListener("endStroke", () => {
      setSignatureDataUrl(pad.toDataURL("image/png"));
    });
    padRef.current = pad;
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
    };
  }, [token]);

  function clearSignature() {
    padRef.current?.clear();
    setSignatureDataUrl("");
    setUseSavedSignature(false);
    setSaveForClient(false);
  }

  function handleSubmit() {
    setError(null);
    const formData = new FormData();
    formData.set("consent", consent ? "on" : "off");
    formData.set("signatureDataUrl", useSavedSignature ? "data:image/png;base64,saved-signature-placeholder" : signatureDataUrl);
    formData.set("useSavedSignature", useSavedSignature ? "on" : "off");
    formData.set("saveForClient", !useSavedSignature && saveForClient ? "on" : "off");

    startTransition(async () => {
      const result = await submitPublicSignature(token, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="rounded-[28px] border border-[#b8d8c5] bg-[#f4fbf6] p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#48745f] text-white">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Firma enviada</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          El estudio ya puede ver la solicitud como firmada y generar los documentos correspondientes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border/80 bg-white p-4 shadow-[0_24px_70px_-58px_rgba(122,56,79,0.34)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Tu firma</p>
          <p className="text-xs text-muted-foreground">Dibuja dentro del recuadro y confirma cuando estes conforme.</p>
        </div>
        <PenLine className="h-5 w-5 text-primary" />
      </div>

      {savedSignatureAvailable ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={useSavedSignature ? "default" : "outline"}
            onClick={() => {
              setUseSavedSignature(true);
              setSaveForClient(false);
            }}
          >
            Usar firma guardada
          </Button>
          <Button
            type="button"
            variant={!useSavedSignature ? "default" : "outline"}
            onClick={() => setUseSavedSignature(false)}
          >
            Dibujar nueva firma
          </Button>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-border/80 bg-muted/20 p-2">
        {useSavedSignature ? (
          <div className="flex aspect-[5/2] items-center justify-center rounded-[20px] bg-white text-sm font-medium text-muted-foreground">
            Se reutilizara tu firma guardada al confirmar.
          </div>
        ) : (
          <canvas ref={canvasRef} className="block aspect-[5/2] w-full rounded-[20px] bg-white touch-none" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={clearSignature}>
          <Eraser className="h-4 w-4" />
          Limpiar
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-white/90 p-4">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(value) => setConsent(value === true)}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="text-sm leading-6 text-muted-foreground">
          Acepto firmar electronicamente este documento y entiendo que se registrara una constancia de fecha, hora y
          datos tecnicos de la operacion.
        </Label>
      </div>

      {!useSavedSignature && canSaveSignatureForClient ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-white/90 p-4">
          <Checkbox
            id="saveForClient"
            checked={saveForClient}
            onCheckedChange={(value) => setSaveForClient(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="saveForClient" className="text-sm leading-6 text-muted-foreground">
            Guardar esta firma para reutilizarla en futuras solicitudes del estudio.
          </Label>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#e8b6bc] bg-[#fff4f5] px-3 py-2 text-sm text-[#9d4d4d]">
          {error}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !consent || (!useSavedSignature && !signatureDataUrl)}
        className="w-full"
      >
        <Check className="h-4 w-4" />
        {isPending ? "Enviando firma..." : "Aceptar y enviar firma"}
      </Button>
    </div>
  );
}
