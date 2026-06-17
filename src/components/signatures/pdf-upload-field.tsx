"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

const maxPdfSizeMb = 10;
const maxPdfSizeBytes = maxPdfSizeMb * 1024 * 1024;

interface PdfUploadFieldProps {
  fileName: string;
  fileSize: string;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function PdfUploadField({ fileName, fileSize, error, onFileChange }: PdfUploadFieldProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="document">Documento PDF</Label>
        <Input
          id="document"
          name="document"
          type="file"
          accept="application/pdf"
          required
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) {
              onFileChange(null, null);
              return;
            }
            if (file.type !== "application/pdf") {
              onFileChange(null, "El archivo debe ser un PDF.");
              event.target.value = "";
              return;
            }
            if (file.size > maxPdfSizeBytes) {
              onFileChange(null, `El PDF no puede superar ${maxPdfSizeMb} MB.`);
              event.target.value = "";
              return;
            }
            onFileChange(file, null);
          }}
        />
      </div>

      {fileName ? (
        <div
          className="flex items-center gap-3 rounded-[24px] border border-[#b8d8c5] bg-[#f4fbf6] px-4 py-3 text-sm"
          aria-live="polite"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">{fileSize} / Listo para subir al crear la solicitud</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          Selecciona un PDF de hasta {maxPdfSizeMb} MB para habilitar la ubicacion de firma.
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-[#e8b6bc] bg-[#fff4f5] px-3 py-2 text-sm text-[#9d4d4d]">
          {error}
        </div>
      ) : null}

      <input type="hidden" name="documentFileName" value={fileName} />
      <input type="hidden" name="documentFileSize" value={fileName ? fileSize : ""} />
    </div>
  );
}

export { formatFileSize };
