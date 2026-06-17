"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Crosshair } from "lucide-react";
import { useMemo, useState } from "react";

interface PdfPlacementSelectorProps {
  previewUrl: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PdfPlacementSelector({ previewUrl }: PdfPlacementSelectorProps) {
  const [placement, setPlacement] = useState({
    pageNumber: 1,
    x: 0.58,
    y: 0.72,
    width: 0.28,
    height: 0.12,
  });

  const rectangleStyle = useMemo(
    () => ({
      left: `${placement.x * 100}%`,
      top: `${placement.y * 100}%`,
      width: `${placement.width * 100}%`,
      height: `${placement.height * 100}%`,
    }),
    [placement]
  );

  function updatePlacement(key: "x" | "y" | "width" | "height", value: number) {
    setPlacement((current) => {
      const next = { ...current, [key]: value };
      next.width = clamp(next.width, 0.08, 0.8);
      next.height = clamp(next.height, 0.05, 0.4);
      next.x = clamp(next.x, 0, 1 - next.width);
      next.y = clamp(next.y, 0, 1 - next.height);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative mx-auto aspect-[3/4] w-full max-w-xl overflow-hidden rounded-[28px] border border-border/80 bg-white shadow-[0_24px_80px_-62px_rgba(122,56,79,0.35)]",
          !previewUrl && "border-dashed bg-muted/20"
        )}
        onClick={(event) => {
          if (!previewUrl) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - placement.width / 2;
          const y = (event.clientY - bounds.top) / bounds.height - placement.height / 2;
          setPlacement((current) => ({
            ...current,
            x: clamp(x, 0, 1 - current.width),
            y: clamp(y, 0, 1 - current.height),
          }));
        }}
      >
        {previewUrl ? (
          <object data={previewUrl} type="application/pdf" className="h-full w-full" aria-label="Vista previa PDF">
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              El navegador no pudo mostrar el PDF, pero la ubicacion se puede ajustar igual.
            </div>
          </object>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <Crosshair className="h-8 w-8 text-primary" />
            Subi un PDF para marcar el lugar exacto de la firma.
          </div>
        )}

        {previewUrl ? (
          <div
            className="pointer-events-none absolute rounded-[14px] border-2 border-[#9a4e69] bg-[#f7d6e0]/35 shadow-[0_0_0_9999px_rgba(255,255,255,0.18)]"
            style={rectangleStyle}
          >
            <span className="absolute -top-7 left-0 rounded-full bg-[#9a4e69] px-3 py-1 text-[0.68rem] font-semibold text-white">
              Firma
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="placement-x">Horizontal</Label>
          <input
            id="placement-x"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={placement.x}
            onChange={(event) => updatePlacement("x", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={!previewUrl}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placement-y">Vertical</Label>
          <input
            id="placement-y"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={placement.y}
            onChange={(event) => updatePlacement("y", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={!previewUrl}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placement-width">Ancho</Label>
          <input
            id="placement-width"
            type="range"
            min="0.08"
            max="0.8"
            step="0.01"
            value={placement.width}
            onChange={(event) => updatePlacement("width", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={!previewUrl}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placement-height">Alto</Label>
          <input
            id="placement-height"
            type="range"
            min="0.05"
            max="0.4"
            step="0.01"
            value={placement.height}
            onChange={(event) => updatePlacement("height", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={!previewUrl}
          />
        </div>
      </div>

      <input type="hidden" name="pageNumber" value={placement.pageNumber} />
      <input type="hidden" name="placementX" value={placement.x.toFixed(4)} />
      <input type="hidden" name="placementY" value={placement.y.toFixed(4)} />
      <input type="hidden" name="placementWidth" value={placement.width.toFixed(4)} />
      <input type="hidden" name="placementHeight" value={placement.height.toFixed(4)} />
    </div>
  );
}
