"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SignatureEmailEditorProps {
  subject: string;
  message: string;
  onSubjectChange: (value: string) => void;
}

export function SignatureEmailEditor({ subject, message, onSubjectChange }: SignatureEmailEditorProps) {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Asunto</Label>
        <Input
          id="subject"
          name="subject"
          required
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          placeholder="Solicitud de firma: Contrato"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensaje del correo</Label>
        <Textarea id="message" name="message" defaultValue={message} />
      </div>
    </div>
  );
}
