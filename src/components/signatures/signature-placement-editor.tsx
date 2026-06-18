"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface PlacementEditorRecipient {
  id: string;
  label: string;
}

export interface PlacementEditorValue {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SignaturePlacementEditorProps {
  recipients: PlacementEditorRecipient[];
  activeRecipientId: string;
  activePlacement: PlacementEditorValue | null;
  missingRecipientLabels: string[];
  canDeletePlacement: boolean;
  onActiveRecipientChange: (recipientId: string) => void;
  onAddPlacement: () => void;
  onDeletePlacement: () => void;
  onPlacementChange: (key: keyof Omit<PlacementEditorValue, "pageNumber">, value: number) => void;
}

export function SignaturePlacementEditor({
  recipients,
  activeRecipientId,
  activePlacement,
  missingRecipientLabels,
  canDeletePlacement,
  onActiveRecipientChange,
  onAddPlacement,
  onDeletePlacement,
  onPlacementChange,
}: SignaturePlacementEditorProps) {
  const controlsDisabled = !activePlacement;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="active-signature-recipient">Destinatario activo</Label>
          <select
            id="active-signature-recipient"
            value={activeRecipientId}
            onChange={(event) => onActiveRecipientChange(event.target.value)}
            className={selectClassName}
          >
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={onAddPlacement}>
          <Plus className="h-4 w-4" />
          Agregar espacio
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onDeletePlacement}
          disabled={!canDeletePlacement}
          aria-label="Eliminar espacio activo"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>

      {missingRecipientLabels.length > 0 ? (
        <div className="rounded-[18px] border border-[#d7c394] bg-[#fff9e8] px-4 py-3 text-sm text-[#775f22]">
          Falta ubicar firma para: {missingRecipientLabels.join(", ")}.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="placement-x">Horizontal</Label>
          <input
            id="placement-x"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={activePlacement?.x ?? 0}
            onChange={(event) => onPlacementChange("x", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={controlsDisabled}
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
            value={activePlacement?.y ?? 0}
            onChange={(event) => onPlacementChange("y", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={controlsDisabled}
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
            value={activePlacement?.width ?? 0.28}
            onChange={(event) => onPlacementChange("width", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={controlsDisabled}
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
            value={activePlacement?.height ?? 0.12}
            onChange={(event) => onPlacementChange("height", Number(event.target.value))}
            className="w-full accent-primary"
            disabled={controlsDisabled}
          />
        </div>
      </div>
    </div>
  );
}
