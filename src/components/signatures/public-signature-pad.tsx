"use client";

import { submitPublicSignature, trackPublicSignatureEvent } from "@/actions/public-signatures";
import { Button } from "@/components/ui/button";
import SignaturePad from "signature_pad";
import { Check, Eraser, PenLine } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface PublicSignaturePadProps {
  token: string;
}

export function PublicSignaturePad({ token }: PublicSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
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
    setError(null);
    void trackPublicSignatureEvent(token, "signing_interrupted");
  }

  function handleSubmit() {
    setError(null);
    const formData = new FormData();
    formData.set("signatureDataUrl", signatureDataUrl);

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
        <h2 className="text-lg font-semibold text-foreground">Gracias, firma enviada</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Ya podes cerrar esta ventana.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border/80 bg-white p-4 shadow-[0_24px_70px_-58px_rgba(122,56,79,0.34)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Tu firma</p>
          <p id="signature-pad-help" className="text-xs text-muted-foreground">
            Dibuja dentro del recuadro.
          </p>
        </div>
        <PenLine className="h-5 w-5 text-primary" />
      </div>

      <div className="rounded-[24px] border border-border/80 bg-muted/20 p-2">
        <canvas
          ref={canvasRef}
          aria-describedby="signature-pad-help"
          aria-label="Area para dibujar la firma electronica"
          className="block aspect-[5/2] w-full rounded-[20px] bg-white touch-none"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="icon" aria-label="Limpiar firma" onClick={clearSignature}>
          <Eraser className="h-4 w-4" />
        </Button>

        <Button type="button" onClick={handleSubmit} disabled={isPending || !signatureDataUrl} className="min-w-48">
          <Check className="h-4 w-4" />
          {isPending ? "Enviando..." : "Confirmar y enviar firma"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#e8b6bc] bg-[#fff4f5] px-3 py-2 text-sm text-[#9d4d4d]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
