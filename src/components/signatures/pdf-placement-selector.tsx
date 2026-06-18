"use client";

import { SignaturePlacementEditor } from "@/components/signatures/signature-placement-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSignaturePlacementVisualState } from "@/lib/signature-placement-colors";
import { ChevronLeft, ChevronRight, Crosshair, Loader2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export interface PdfPlacementRecipient {
  id: string;
  label: string;
}

interface PdfPlacementSelectorProps {
  previewUrl: string | null;
  recipients?: PdfPlacementRecipient[];
  onReadyChange?: (ready: boolean) => void;
}

interface SignaturePlacementDraft {
  id: string;
  recipientId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createPlacementId() {
  return `placement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildDefaultPlacement(
  recipientId: string,
  index = 0,
  id = `${recipientId}-placement-${index}`,
  pageNumber = 1
) {
  return {
    id,
    recipientId,
    pageNumber,
    x: clamp(0.58 - (index % 3) * 0.04, 0, 0.72),
    y: clamp(0.72 - (index % 3) * 0.05, 0, 0.88),
    width: 0.28,
    height: 0.12,
  };
}

function getRecipientLabel(recipient: PdfPlacementRecipient, index: number) {
  return recipient.label.trim() || `Destinatario ${index + 1}`;
}

export function PdfPlacementSelector({ previewUrl, recipients = [], onReadyChange }: PdfPlacementSelectorProps) {
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const normalizedRecipients = useMemo(
    () => (recipients.length > 0 ? recipients : [{ id: "legacy-recipient", label: "Firma" }]),
    [recipients]
  );
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [activeRecipientId, setActiveRecipientId] = useState(normalizedRecipients[0]?.id ?? "");
  const [placements, setPlacements] = useState<SignaturePlacementDraft[]>(() =>
    normalizedRecipients[0] ? [buildDefaultPlacement(normalizedRecipients[0].id)] : []
  );
  const [activePlacementId, setActivePlacementId] = useState(() => placements[0]?.id ?? "");

  const recipientIndexById = useMemo(
    () => new Map(normalizedRecipients.map((recipient, index) => [recipient.id, index])),
    [normalizedRecipients]
  );

  const activePlacement = placements.find((placement) => placement.id === activePlacementId) ?? null;
  const activeRecipientPlacements = useMemo(
    () => placements.filter((placement) => placement.recipientId === activeRecipientId),
    [activeRecipientId, placements]
  );
  const visiblePlacements = useMemo(
    () => placements.filter((placement) => placement.pageNumber === activePageNumber),
    [activePageNumber, placements]
  );
  const missingRecipients = useMemo(
    () => normalizedRecipients.filter((recipient) => !placements.some((placement) => placement.recipientId === recipient.id)),
    [normalizedRecipients, placements]
  );

  useEffect(() => {
    const node = pageContainerRef.current;
    if (!node) return;

    const updateWidth = () => setPageWidth(Math.min(node.clientWidth, 760));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewUrl]);

  useEffect(() => {
    const validRecipientIds = new Set(normalizedRecipients.map((recipient) => recipient.id));

    setPlacements((current) => {
      const kept = current.filter((placement) => validRecipientIds.has(placement.recipientId));
      if (kept.length === 0 && normalizedRecipients[0]) return [buildDefaultPlacement(normalizedRecipients[0].id)];
      if (kept.length === current.length) return current;
      return kept;
    });

    setActiveRecipientId((current) => (validRecipientIds.has(current) ? current : normalizedRecipients[0]?.id ?? ""));
  }, [normalizedRecipients]);

  useEffect(() => {
    const activeExists = activeRecipientPlacements.some((placement) => placement.id === activePlacementId);
    if (!activeExists) setActivePlacementId(activeRecipientPlacements[0]?.id ?? "");
  }, [activePlacementId, activeRecipientPlacements]);

  useEffect(() => {
    onReadyChange?.(normalizedRecipients.length > 0 && missingRecipients.length === 0);
  }, [missingRecipients.length, normalizedRecipients.length, onReadyChange]);

  function updateActivePlacement(key: "x" | "y" | "width" | "height", value: number) {
    if (!activePlacement) return;

    setPlacements((current) =>
      current.map((placement) => {
        if (placement.id !== activePlacement.id) return placement;

        const next = { ...placement, [key]: value };
        next.width = clamp(next.width, 0.08, 0.8);
        next.height = clamp(next.height, 0.05, 0.4);
        next.x = clamp(next.x, 0, 1 - next.width);
        next.y = clamp(next.y, 0, 1 - next.height);
        return next;
      })
    );
  }

  function handlePreviewClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!previewUrl || !activePlacement) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - activePlacement.width / 2;
    const y = (event.clientY - bounds.top) / bounds.height - activePlacement.height / 2;
    setPlacements((current) =>
      current.map((placement) => {
        if (placement.id !== activePlacement.id) return placement;

        return {
          ...placement,
          pageNumber: activePageNumber,
          x: clamp(x, 0, 1 - placement.width),
          y: clamp(y, 0, 1 - placement.height),
        };
      })
    );
  }

  function handleActiveRecipientChange(recipientId: string) {
    const nextPlacement = placements.find((placement) => placement.recipientId === recipientId);
    setActiveRecipientId(recipientId);
    setActivePlacementId(nextPlacement?.id ?? "");
    if (nextPlacement) setActivePageNumber(nextPlacement.pageNumber);
  }

  function handleAddPlacement() {
    if (!activeRecipientId) return;

    setPlacements((current) => {
      const nextIndex = current.filter((placement) => placement.recipientId === activeRecipientId).length;
      const nextPlacement = buildDefaultPlacement(activeRecipientId, nextIndex, createPlacementId(), activePageNumber);
      setActivePlacementId(nextPlacement.id);
      return [...current, nextPlacement];
    });
  }

  function handleDeletePlacement() {
    if (!activePlacement) return;

    setPlacements((current) => {
      const next = current.filter((placement) => placement.id !== activePlacement.id);
      const nextActive = next.find((placement) => placement.recipientId === activeRecipientId);
      setActivePlacementId(nextActive?.id ?? "");
      return next;
    });
  }

  const firstPlacement = placements[0] ?? buildDefaultPlacement(normalizedRecipients[0]?.id ?? "legacy-recipient");

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="space-y-3">
          <div ref={pageContainerRef} className="mx-auto w-full max-w-2xl">
            <Document
              file={previewUrl}
              loading={
                <div className="flex min-h-[28rem] items-center justify-center rounded-[28px] border border-border/80 bg-muted/20 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando PDF
                </div>
              }
              error={
                <div className="flex min-h-[28rem] items-center justify-center rounded-[28px] border border-border/80 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No se pudo mostrar la vista previa del PDF.
                </div>
              }
              onLoadSuccess={({ numPages: nextNumPages }) => {
                setNumPages(nextNumPages);
                setActivePageNumber((current) => clamp(current, 1, nextNumPages));
              }}
            >
              <div
                className="relative mx-auto overflow-hidden rounded-[28px] border border-border/80 bg-white shadow-[0_24px_80px_-62px_rgba(122,56,79,0.35)]"
                onClick={handlePreviewClick}
              >
                <Page
                  pageNumber={activePageNumber}
                  width={pageWidth || undefined}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={
                    <div className="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando pagina
                    </div>
                  }
                />

                {visiblePlacements.map((placement) => {
                  const recipientIndex = recipientIndexById.get(placement.recipientId) ?? 0;
                  const recipient = normalizedRecipients[recipientIndex];
                  const isActiveRecipient = placement.recipientId === activeRecipientId;
                  const isActivePlacement = placement.id === activePlacementId;
                  const visualState = getSignaturePlacementVisualState(recipientIndex, isActiveRecipient);
                  const recipientPlacements = placements.filter((item) => item.recipientId === placement.recipientId);
                  const placementNumber = recipientPlacements.findIndex((item) => item.id === placement.id) + 1;

                  return (
                    <button
                      key={placement.id}
                      type="button"
                      className={cn(
                        "absolute rounded-[14px] text-left transition-all",
                        isActivePlacement && "ring-2 ring-white ring-offset-2 ring-offset-transparent"
                      )}
                      style={{
                        left: `${placement.x * 100}%`,
                        top: `${placement.y * 100}%`,
                        width: `${placement.width * 100}%`,
                        height: `${placement.height * 100}%`,
                        border: `${visualState.borderWidth}px solid ${visualState.color.border}`,
                        backgroundColor: visualState.color.background,
                        boxShadow: visualState.shadow,
                        opacity: visualState.opacity,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveRecipientId(placement.recipientId);
                        setActivePlacementId(placement.id);
                      }}
                      aria-label={`Seleccionar espacio ${placementNumber} de ${getRecipientLabel(recipient, recipientIndex)}`}
                    >
                      <span
                        className="absolute -top-7 left-0 max-w-[13rem] truncate rounded-full px-3 py-1 text-[0.68rem] font-semibold text-white"
                        style={{ backgroundColor: visualState.color.label }}
                      >
                        {getRecipientLabel(recipient, recipientIndex)} #{placementNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Document>
          </div>

          {numPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={activePageNumber <= 1}
                onClick={() => setActivePageNumber((current) => Math.max(1, current - 1))}
                aria-label="Pagina anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {activePageNumber} de {numPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={activePageNumber >= numPages}
                onClick={() => setActivePageNumber((current) => Math.min(numPages, current + 1))}
                aria-label="Pagina siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "relative mx-auto aspect-[3/4] w-full max-w-xl overflow-hidden rounded-[28px] border border-dashed border-border/80 bg-muted/20 shadow-[0_24px_80px_-62px_rgba(122,56,79,0.35)]"
          )}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <Crosshair className="h-8 w-8 text-primary" />
            Subi un PDF para marcar el lugar exacto de la firma.
          </div>
        </div>
      )}

      <SignaturePlacementEditor
        recipients={normalizedRecipients.map((recipient, index) => ({
          id: recipient.id,
          label: getRecipientLabel(recipient, index),
        }))}
        activeRecipientId={activeRecipientId}
        activePlacement={activePlacement}
        missingRecipientLabels={missingRecipients.map((recipient, index) => getRecipientLabel(recipient, index))}
        canDeletePlacement={Boolean(activePlacement)}
        onActiveRecipientChange={handleActiveRecipientChange}
        onAddPlacement={handleAddPlacement}
        onDeletePlacement={handleDeletePlacement}
        onPlacementChange={updateActivePlacement}
      />

      <input type="hidden" name="pageNumber" value={firstPlacement.pageNumber} />
      <input type="hidden" name="placementX" value={firstPlacement.x.toFixed(4)} />
      <input type="hidden" name="placementY" value={firstPlacement.y.toFixed(4)} />
      <input type="hidden" name="placementWidth" value={firstPlacement.width.toFixed(4)} />
      <input type="hidden" name="placementHeight" value={firstPlacement.height.toFixed(4)} />

      {normalizedRecipients.map((recipient, recipientIndex) => {
        const recipientPlacements = placements.filter((placement) => placement.recipientId === recipient.id);

        return recipientPlacements.map((placement, placementIndex) => (
          <Fragment key={placement.id}>
            <input
              type="hidden"
              name={`recipients[${recipientIndex}].placements[${placementIndex}].pageNumber`}
              value={placement.pageNumber}
            />
            <input
              type="hidden"
              name={`recipients[${recipientIndex}].placements[${placementIndex}].x`}
              value={placement.x.toFixed(4)}
            />
            <input
              type="hidden"
              name={`recipients[${recipientIndex}].placements[${placementIndex}].y`}
              value={placement.y.toFixed(4)}
            />
            <input
              type="hidden"
              name={`recipients[${recipientIndex}].placements[${placementIndex}].width`}
              value={placement.width.toFixed(4)}
            />
            <input
              type="hidden"
              name={`recipients[${recipientIndex}].placements[${placementIndex}].height`}
              value={placement.height.toFixed(4)}
            />
          </Fragment>
        ));
      })}
    </div>
  );
}
