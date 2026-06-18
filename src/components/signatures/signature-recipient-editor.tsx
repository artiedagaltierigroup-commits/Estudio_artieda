"use client";

import { splitPersonName } from "@/actions/signatures-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BriefcaseBusiness, IdCard, Mail, Trash2, UserRound } from "lucide-react";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface SignatureRecipientDraft {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  taxId: string;
}

export interface SignatureRecipientClientOption {
  id: string;
  name: string;
  email: string | null;
  taxId: string | null;
  hasSavedSignature: boolean;
}

interface SignatureRecipientEditorProps {
  index: number;
  recipient: SignatureRecipientDraft;
  clients: SignatureRecipientClientOption[];
  canRemove: boolean;
  onChange: (id: string, patch: Partial<SignatureRecipientDraft>) => void;
  onRemove: (id: string) => void;
}

export function SignatureRecipientEditor({
  index,
  recipient,
  clients,
  canRemove,
  onChange,
  onRemove,
}: SignatureRecipientEditorProps) {
  const selectedClient = clients.find((client) => client.id === recipient.clientId) ?? null;
  const title = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || `Destinatario ${index + 1}`;

  function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      onChange(recipient.id, { clientId });
      return;
    }

    const name = splitPersonName(client.name);
    onChange(recipient.id, {
      clientId,
      firstName: name.firstName,
      lastName: name.lastName,
      email: client.email ?? "",
      taxId: client.taxId ?? "",
    });
  }

  return (
    <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{recipient.email || "Email pendiente"}</p>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Quitar destinatario ${index + 1}`}
            onClick={() => onRemove(recipient.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`recipient-${recipient.id}-client`} className="inline-flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-primary" />
            Cliente
          </Label>
          <select
            id={`recipient-${recipient.id}-client`}
            name={`recipients[${index}].clientId`}
            value={recipient.clientId}
            onChange={(event) => handleClientChange(event.target.value)}
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
          <Label htmlFor={`recipient-${recipient.id}-firstName`} className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            Nombre
          </Label>
          <Input
            id={`recipient-${recipient.id}-firstName`}
            name={`recipients[${index}].firstName`}
            value={recipient.firstName}
            onChange={(event) => onChange(recipient.id, { firstName: event.target.value })}
            placeholder="Nombre"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recipient-${recipient.id}-lastName`}>Apellido</Label>
          <Input
            id={`recipient-${recipient.id}-lastName`}
            name={`recipients[${index}].lastName`}
            value={recipient.lastName}
            onChange={(event) => onChange(recipient.id, { lastName: event.target.value })}
            placeholder="Apellido"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recipient-${recipient.id}-email`} className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Email
          </Label>
          <Input
            id={`recipient-${recipient.id}-email`}
            name={`recipients[${index}].email`}
            type="email"
            required
            value={recipient.email}
            onChange={(event) => onChange(recipient.id, { email: event.target.value })}
            placeholder="cliente@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recipient-${recipient.id}-taxId`} className="inline-flex items-center gap-2">
            <IdCard className="h-4 w-4 text-primary" />
            DNI / CUIT opcional
          </Label>
          <Input
            id={`recipient-${recipient.id}-taxId`}
            name={`recipients[${index}].taxId`}
            value={recipient.taxId}
            onChange={(event) => onChange(recipient.id, { taxId: event.target.value })}
            placeholder="Identificacion"
          />
        </div>
      </div>

      {selectedClient?.hasSavedSignature ? (
        <div className="mt-4 rounded-[18px] border border-[#d7c394] bg-[#fff9e8] px-4 py-3 text-sm text-[#775f22]">
          Este cliente tiene una firma guardada. Podra elegir reutilizarla al firmar.
        </div>
      ) : null}
    </div>
  );
}
