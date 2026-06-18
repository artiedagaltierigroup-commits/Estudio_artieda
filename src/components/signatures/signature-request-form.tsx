"use client";

import { useActionState, useState } from "react";
import { PdfPlacementSelector } from "@/components/signatures/pdf-placement-selector";
import { formatFileSize, PdfUploadField } from "@/components/signatures/pdf-upload-field";
import { SignatureEmailEditor } from "@/components/signatures/signature-email-editor";
import {
  SignatureRecipientDraft,
  SignatureRecipientList,
} from "@/components/signatures/signature-recipient-list";
import { SectionCard } from "@/components/system/section-card";
import { SubmitButton } from "@/components/system/submit-button";
import { Button } from "@/components/ui/button";
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
  action: (
    state: SignatureRequestFormState,
    formData: FormData
  ) => SignatureRequestFormState | Promise<SignatureRequestFormState>;
  cancelHref: string;
  clients: SignatureClientOption[];
  cases: SignatureCaseOption[];
  defaultClientId?: string | null;
  defaultCaseId?: string | null;
}

interface SignatureRequestFormState {
  error?: string | null;
  signatureRequestId?: string | null;
}

function buildDefaultSubject(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return cleanName ? `Solicitud de firma: ${cleanName}` : "Solicitud de firma";
}

function createRecipientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `recipient-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildRecipientFromClient(client: SignatureClientOption | null, id = createRecipientId()): SignatureRecipientDraft {
  const name = splitPersonName(client?.name);

  return {
    id,
    clientId: client?.id ?? "",
    firstName: name.firstName,
    lastName: name.lastName,
    email: client?.email ?? "",
    taxId: client?.taxId ?? "",
  };
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
  const [recipients, setRecipients] = useState<SignatureRecipientDraft[]>([
    buildRecipientFromClient(initialClient, "recipient-0"),
  ]);
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId ?? "");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placementsReady, setPlacementsReady] = useState(false);
  const [subject, setSubject] = useState("Solicitud de firma");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [submitState, formAction] = useActionState(action, { error: null, signatureRequestId: null });

  function handleRecipientChange(id: string, patch: Partial<SignatureRecipientDraft>) {
    setRecipients((current) => current.map((recipient) => (recipient.id === id ? { ...recipient, ...patch } : recipient)));
  }

  function handleAddRecipient() {
    setRecipients((current) => [...current, buildRecipientFromClient(null)]);
  }

  function handleRemoveRecipient(id: string) {
    setRecipients((current) => (current.length > 1 ? current.filter((recipient) => recipient.id !== id) : current));
  }

  return (
    <form action={formAction} className="space-y-6">
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
            <PdfPlacementSelector
              previewUrl={previewUrl}
              recipients={recipients.map((recipient, index) => ({
                id: recipient.id,
                label:
                  [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") ||
                  recipient.email ||
                  `Destinatario ${index + 1}`,
              }))}
              onReadyChange={setPlacementsReady}
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Destinatario"
          title="Quienes firman"
          description="Agrega una o varias personas. Cada una recibira su propio link seguro."
        >
          <SignatureRecipientList
            recipients={recipients}
            clients={clients}
            onAdd={handleAddRecipient}
            onChange={handleRecipientChange}
            onRemove={handleRemoveRecipient}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Caso"
          title="Caso asociado"
          description="El caso se asigna a la solicitud completa; cada destinatario puede tener su propio cliente."
        >
          <div className="max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="caseId">Caso</Label>
              <select
                id="caseId"
                name="caseId"
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Sin caso asociado</option>
                {cases.map((currentCase) => (
                  <option key={currentCase.id} value={currentCase.id}>
                    {currentCase.title}
                    {currentCase.clientName ? ` - ${currentCase.clientName}` : ""}
                  </option>
                ))}
              </select>
            </div>
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
          {submitState.error ? (
            <div className="basis-full rounded-[18px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              <p>{submitState.error}</p>
              {submitState.signatureRequestId ? (
                <Link className="mt-2 inline-block font-semibold underline" href={`/firmas/${submitState.signatureRequestId}`}>
                  Abrir solicitud guardada
                </Link>
              ) : null}
            </div>
          ) : null}
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <SubmitButton pendingLabel="Creando solicitud..." disabled={!previewUrl || !placementsReady}>
            <Save className="h-4 w-4" />
            Crear y enviar
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
