"use client";

import { useMemo, useState } from "react";
import { PdfPlacementSelector } from "@/components/signatures/pdf-placement-selector";
import { formatFileSize, PdfUploadField } from "@/components/signatures/pdf-upload-field";
import { SignatureEmailEditor } from "@/components/signatures/signature-email-editor";
import { SectionCard } from "@/components/system/section-card";
import { SubmitButton } from "@/components/system/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitPersonName } from "@/actions/signatures-helpers";
import { Save } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const defaultMessage =
  "Hola, te enviamos este documento para revisar y firmar electronicamente. Abrilo desde el boton seguro y confirma la firma cuando estes conforme.";

interface SignatureClientOption {
  id: string;
  name: string;
  email: string | null;
  taxId: string | null;
  hasSavedSignature: boolean;
}

interface SignatureCaseOption {
  id: string;
  title: string;
  clientId: string;
  clientName: string | null;
}

interface SignatureRequestFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  clients: SignatureClientOption[];
  cases: SignatureCaseOption[];
  defaultClientId?: string | null;
  defaultCaseId?: string | null;
}

function buildDefaultSubject(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return cleanName ? `Solicitud de firma: ${cleanName}` : "Solicitud de firma";
}

export function SignatureRequestForm({
  action,
  cancelHref,
  clients,
  cases,
  defaultClientId,
  defaultCaseId,
}: SignatureRequestFormProps) {
  const initialCase = cases.find((currentCase) => currentCase.id === defaultCaseId);
  const initialClientId = defaultClientId ?? initialCase?.clientId ?? "";
  const initialClient = clients.find((client) => client.id === initialClientId) ?? null;
  const initialClientName = splitPersonName(initialClient?.name);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId ?? "");
  const [recipientFirstName, setRecipientFirstName] = useState(initialClientName.firstName);
  const [recipientLastName, setRecipientLastName] = useState(initialClientName.lastName);
  const [recipientEmail, setRecipientEmail] = useState(initialClient?.email ?? "");
  const [recipientTaxId, setRecipientTaxId] = useState(initialClient?.taxId ?? "");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState("Solicitud de firma");
  const [subjectTouched, setSubjectTouched] = useState(false);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const filteredCases = useMemo(
    () => cases.filter((currentCase) => !selectedClientId || currentCase.clientId === selectedClientId),
    [cases, selectedClientId]
  );

  function fillRecipientFromClient(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    const clientName = splitPersonName(client.name);
    setRecipientFirstName(clientName.firstName);
    setRecipientLastName(clientName.lastName);
    setRecipientEmail(client.email ?? "");
    setRecipientTaxId(client.taxId ?? "");
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-6">
        <SectionCard
          eyebrow="Documento"
          title="PDF para firmar"
          description="Sube el documento y marca donde debe aparecer la firma del destinatario."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(320px,1.15fr)]">
            <PdfUploadField
              fileName={fileName}
              fileSize={fileSize}
              error={fileError}
              onFileChange={(file, error) => {
                setFileError(error);
                if (!file || error) {
                  setFileName("");
                  setFileSize("");
                  setPreviewUrl(null);
                  return;
                }

                setFileName(file.name);
                setFileSize(formatFileSize(file.size));
                setPreviewUrl(URL.createObjectURL(file));
                if (!subjectTouched) setSubject(buildDefaultSubject(file.name));
              }}
            />
            <PdfPlacementSelector previewUrl={previewUrl} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Destinatario"
          title="Quien firma"
          description="Datos minimos para enviar el link y dejar registro de la solicitud."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipientFirstName">Nombre</Label>
              <Input
                id="recipientFirstName"
                name="recipientFirstName"
                value={recipientFirstName}
                onChange={(event) => setRecipientFirstName(event.target.value)}
                placeholder="Nombre del firmante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientLastName">Apellido</Label>
              <Input
                id="recipientLastName"
                name="recipientLastName"
                value={recipientLastName}
                onChange={(event) => setRecipientLastName(event.target.value)}
                placeholder="Apellido del firmante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email</Label>
              <Input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                required
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientTaxId">DNI / CUIT opcional</Label>
              <Input
                id="recipientTaxId"
                name="recipientTaxId"
                value={recipientTaxId}
                onChange={(event) => setRecipientTaxId(event.target.value)}
                placeholder="Identificacion del firmante"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Asociacion"
          title="Cliente y caso opcionales"
          description="Conecta la solicitud con la ficha correcta para encontrarla despues desde el sistema."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <select
                id="clientId"
                name="clientId"
                value={selectedClientId}
                onChange={(event) => {
                  const nextClientId = event.target.value;
                  setSelectedClientId(nextClientId);
                  setSelectedCaseId("");
                  fillRecipientFromClient(nextClientId);
                }}
                className={selectClassName}
              >
                <option value="">Sin cliente asociado</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseId">Caso</Label>
              <select
                id="caseId"
                name="caseId"
                value={selectedCaseId}
                onChange={(event) => {
                  const nextCaseId = event.target.value;
                  setSelectedCaseId(nextCaseId);
                  const nextCase = cases.find((currentCase) => currentCase.id === nextCaseId);
                  if (nextCase) {
                    setSelectedClientId(nextCase.clientId);
                    fillRecipientFromClient(nextCase.clientId);
                  }
                }}
                className={selectClassName}
              >
                <option value="">Sin caso asociado</option>
                {filteredCases.map((currentCase) => (
                  <option key={currentCase.id} value={currentCase.id}>
                    {currentCase.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient?.hasSavedSignature ? (
              <div className="rounded-[24px] border border-[#d7c394] bg-[#fff9e8] px-4 py-3 text-sm text-[#775f22] sm:col-span-2">
                Este cliente tiene una firma guardada. Podra elegir reutilizarla al firmar.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Correo"
          title="Aviso de firma"
          description="El asunto viene precargado y se puede ajustar antes del envio."
        >
          <SignatureEmailEditor
            subject={subject}
            message={defaultMessage}
            onSubjectChange={(value) => {
              setSubjectTouched(true);
              setSubject(value);
            }}
          />
        </SectionCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <SubmitButton pendingLabel="Creando solicitud...">
            <Save className="h-4 w-4" />
            Crear y enviar
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
