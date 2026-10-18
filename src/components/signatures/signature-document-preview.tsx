"use client";

import type {
  PdfPlacementRecipient,
  SignaturePlacementDraft,
} from "@/components/signatures/pdf-placement-selector";
import dynamic from "next/dynamic";

const PdfPlacementSelector = dynamic(
  () => import("@/components/signatures/pdf-placement-selector").then((module) => module.PdfPlacementSelector),
  { ssr: false, loading: () => <p role="status">Cargando visor de PDF...</p> },
);

interface SignatureDocumentPreviewProps {
  previewUrl: string;
  recipients: PdfPlacementRecipient[];
  placements: SignaturePlacementDraft[];
}

export function SignatureDocumentPreview({
  previewUrl,
  recipients,
  placements,
}: SignatureDocumentPreviewProps) {
  return (
    <PdfPlacementSelector
      previewUrl={previewUrl}
      recipients={recipients}
      initialPlacements={placements}
      readOnly
    />
  );
}
