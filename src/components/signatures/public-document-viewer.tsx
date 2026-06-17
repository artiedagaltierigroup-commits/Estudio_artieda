"use client";

import { trackPublicSignatureEvent } from "@/actions/public-signatures";
import { useEffect } from "react";

interface PublicDocumentViewerProps {
  token: string;
  previewUrl: string | null;
  fileName: string;
  placement: {
    x: string;
    y: string;
    width: string;
    height: string;
  };
}

export function PublicDocumentViewer({ token, previewUrl, fileName, placement }: PublicDocumentViewerProps) {
  useEffect(() => {
    void trackPublicSignatureEvent(token, "document_viewed");
  }, [token]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{fileName}</p>
        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
          Vista previa
        </span>
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-border/80 bg-white">
        {previewUrl ? (
          <object data={previewUrl} type="application/pdf" className="h-full w-full" aria-label={fileName}>
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No se pudo mostrar el PDF en este navegador.
            </div>
          </object>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Vista previa no disponible.
          </div>
        )}
        <div
          className="pointer-events-none absolute rounded-[14px] border-2 border-[#9a4e69] bg-[#f7d6e0]/35"
          style={{
            left: `${Number(placement.x) * 100}%`,
            top: `${Number(placement.y) * 100}%`,
            width: `${Number(placement.width) * 100}%`,
            height: `${Number(placement.height) * 100}%`,
          }}
        >
          <span className="absolute -top-7 left-0 rounded-full bg-[#9a4e69] px-3 py-1 text-[0.68rem] font-semibold text-white">
            Firma
          </span>
        </div>
      </div>
    </div>
  );
}
