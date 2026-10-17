"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/system/submit-button";

interface ReminderReferences {
  assistants: Array<{ userId: string; displayName: string }>;
  clients: Array<{ id: string; name: string }>;
  cases: Array<{ id: string; title: string; clientName: string }>;
}

interface CreateReminderProps {
  action: (formData: FormData) => void | Promise<void>;
  role: "ADMIN" | "COLLABORATOR";
  displayName: string;
  references: ReminderReferences;
}

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CreateReminderForm({
  action,
  role,
  displayName,
  references,
  cancelControl,
}: CreateReminderProps & { cancelControl?: ReactNode }) {
  return (
    <form action={action} className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-reminder-title">Titulo</Label>
          <Input id="create-reminder-title" name="title" required autoFocus placeholder="Ejemplo: escribirle a cliente o revisar vencimiento" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-reminder-date">Fecha y hora</Label>
          <Input id="create-reminder-date" name="reminderDate" type="datetime-local" required />
        </div>
        {role === "ADMIN" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="create-reminder-assignee">Asignar a</Label>
            <select id="create-reminder-assignee" name="assigneeUserId" className={selectClassName} defaultValue="">
              <option value="">Solo para {displayName}</option>
              {references.assistants.map((assistant) => (
                <option key={assistant.userId} value={assistant.userId}>{assistant.displayName}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:col-span-2">
            Esta tarea quedará asignada a {displayName} y también será visible para Victoria.
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="create-reminder-priority">Prioridad</Label>
          <select id="create-reminder-priority" name="priority" className={selectClassName}>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-reminder-client">Cliente opcional</Label>
          <select id="create-reminder-client" name="clientId" className={selectClassName} defaultValue="">
            <option value="">General</option>
            {references.clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-reminder-case">Caso opcional</Label>
          <select id="create-reminder-case" name="caseId" className={selectClassName} defaultValue="">
            <option value="">Sin caso asociado</option>
            {references.cases.map((currentCase) => (
              <option key={currentCase.id} value={currentCase.id}>
                {currentCase.clientName} - {currentCase.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-reminder-description">Descripcion</Label>
          <Textarea
            id="create-reminder-description"
            name="description"
            className="min-h-[110px]"
            placeholder="Contexto breve para recordar por que hay que hacer esta accion."
          />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
        {cancelControl ?? <Button type="button" variant="outline">Cancelar</Button>}
        <SubmitButton>
          <Plus className="h-4 w-4" />
          Guardar tarea
        </SubmitButton>
      </div>
    </form>
  );
}

export function CreateReminderDialog(props: CreateReminderProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva tarea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>
            Puede ser general, ligada a un cliente o asociada a un caso puntual.
          </DialogDescription>
        </DialogHeader>
        <CreateReminderForm
          {...props}
          cancelControl={
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
