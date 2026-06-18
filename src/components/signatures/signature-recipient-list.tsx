"use client";

import { MAX_SIGNATURE_RECIPIENTS } from "@/lib/signature-recipients";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  SignatureRecipientEditor,
} from "./signature-recipient-editor";
import type { SignatureRecipientClientOption, SignatureRecipientDraft } from "./signature-recipient-editor";

export type { SignatureRecipientClientOption, SignatureRecipientDraft } from "./signature-recipient-editor";

interface SignatureRecipientListProps {
  recipients: SignatureRecipientDraft[];
  clients: SignatureRecipientClientOption[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<SignatureRecipientDraft>) => void;
  onRemove: (id: string) => void;
}

export function SignatureRecipientList({
  recipients,
  clients,
  onAdd,
  onChange,
  onRemove,
}: SignatureRecipientListProps) {
  const reachedLimit = recipients.length >= MAX_SIGNATURE_RECIPIENTS;

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {recipients.map((recipient, index) => (
          <SignatureRecipientEditor
            key={recipient.id}
            index={index}
            recipient={recipient}
            clients={clients}
            canRemove={recipients.length > 1}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onAdd} disabled={reachedLimit}>
          <Plus className="h-4 w-4" />
          Agregar destinatario
        </Button>
        {reachedLimit ? (
          <p className="text-sm font-medium text-muted-foreground">No se pueden agregar mas destinatarios.</p>
        ) : null}
      </div>
    </div>
  );
}
