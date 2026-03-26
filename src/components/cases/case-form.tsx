"use client";

import { useState, useTransition } from "react";
import { createClientInlineAction } from "@/actions/clients";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { filterCaseFormClients, type CaseFormClientOption } from "@/lib/case-form-clients";
import { cn } from "@/lib/utils";
import { Plus, Save, Search, UserPlus } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface CaseFormProps {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  clients: Array<CaseFormClientOption>;
  defaultClientId?: string | null;
  initialValues?: {
    clientId?: string | null;
    title?: string | null;
    description?: string | null;
    status?: "ACTIVE" | "CLOSED" | "SUSPENDED" | null;
    priority?: "LOW" | "MEDIUM" | "HIGH" | null;
    fee?: string | null;
    preferredPaymentMethod?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };
}

interface QuickClientDraft {
  name: string;
  phone: string;
  email: string;
  taxId: string;
  languages: string;
}

const emptyQuickClientDraft: QuickClientDraft = {
  name: "",
  phone: "",
  email: "",
  taxId: "",
  languages: "",
};

export function CaseForm({
  action,
  cancelHref,
  submitLabel,
  clients,
  defaultClientId,
  initialValues,
}: CaseFormProps) {
  const initialClientId = initialValues?.clientId ?? defaultClientId ?? "";
  const initialClient = clients.find((client) => client.id === initialClientId) ?? null;

  const [availableClients, setAvailableClients] = useState(clients);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [clientQuery, setClientQuery] = useState(initialClient?.name ?? "");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientDraft, setQuickClientDraft] = useState<QuickClientDraft>(emptyQuickClientDraft);
  const [quickClientError, setQuickClientError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredClients = filterCaseFormClients(availableClients, clientQuery);

  const selectedClient = availableClients.find((client) => client.id === selectedClientId) ?? null;

  function handleSelectClient(client: CaseFormClientOption) {
    setSelectedClientId(client.id);
    setClientQuery(client.name);
    setClientPickerOpen(false);
  }

  function handleQuickClientChange(field: keyof QuickClientDraft, value: string) {
    setQuickClientDraft((current) => ({ ...current, [field]: value }));
  }

  function handleQuickCreateClient() {
    setQuickClientError(null);

    startTransition(async () => {
      const result = await createClientInlineAction(quickClientDraft);
      if (result?.error) {
        setQuickClientError(result.error);
        return;
      }

      if (result?.success) {
        const createdClient = result.client;
        setAvailableClients((current) =>
          [...current, createdClient].sort((left, right) => left.name.localeCompare(right.name, "es"))
        );
        setSelectedClientId(createdClient.id);
        setClientQuery(createdClient.name);
        setQuickClientDraft(emptyQuickClientDraft);
        setQuickClientOpen(false);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <form action={action} className="space-y-6">
        <input type="hidden" name="clientId" value={selectedClientId} />

        <SectionCard
          eyebrow="Relacion"
          title="Cliente y contexto base"
          description="Busca un cliente existente y, si hace falta, cargalo rapido sin salir del caso."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client-search">Cliente</Label>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-[22px] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="client-search"
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value);
                      setClientPickerOpen(true);
                      setSelectedClientId("");
                    }}
                    onFocus={() => setClientPickerOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setClientPickerOpen(false), 120);
                    }}
                    placeholder="Buscar cliente por nombre, email, telefono o identificacion"
                    className="pl-11"
                    autoComplete="off"
                  />

                  {clientPickerOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-2xl border border-border/80 bg-white p-2 shadow-[0_24px_60px_-42px_rgba(122,56,79,0.26)]">
                      <div className="max-h-72 space-y-1 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectClient(client)}
                              className={cn(
                                "w-full rounded-2xl border px-3 py-3 text-left transition hover:bg-muted/40",
                                selectedClientId === client.id
                                  ? "border-primary/35 bg-primary/5"
                                  : "border-transparent bg-white"
                              )}
                            >
                              <p className="text-sm font-medium text-foreground">{client.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[client.email, client.phone, client.taxId].filter(Boolean).join(" • ") ||
                                  "Sin datos extra"}
                              </p>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
                            No hay clientes que coincidan con lo que escribiste.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <Popover open={quickClientOpen} onOpenChange={setQuickClientOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="shrink-0">
                      <UserPlus className="h-4 w-4" />
                      Anadir nuevo cliente
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(32rem,calc(100vw-2rem))] p-0">
                    <div className="space-y-4 p-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">Alta rapida de cliente</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Guardalo en dos pasos y queda seleccionado automaticamente en este caso.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="quick-client-name">Nombre</Label>
                          <Input
                            id="quick-client-name"
                            value={quickClientDraft.name}
                            onChange={(event) => handleQuickClientChange("name", event.target.value)}
                            placeholder="Nombre y apellido o razon social"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quick-client-phone">Telefono</Label>
                          <Input
                            id="quick-client-phone"
                            value={quickClientDraft.phone}
                            onChange={(event) => handleQuickClientChange("phone", event.target.value)}
                            placeholder="Numero de contacto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quick-client-email">Email</Label>
                          <Input
                            id="quick-client-email"
                            type="email"
                            value={quickClientDraft.email}
                            onChange={(event) => handleQuickClientChange("email", event.target.value)}
                            placeholder="cliente@email.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quick-client-taxid">Identificacion fiscal</Label>
                          <Input
                            id="quick-client-taxid"
                            value={quickClientDraft.taxId}
                            onChange={(event) => handleQuickClientChange("taxId", event.target.value)}
                            placeholder="CUIT, DNI u otra referencia"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quick-client-languages">Idiomas</Label>
                          <Input
                            id="quick-client-languages"
                            value={quickClientDraft.languages}
                            onChange={(event) => handleQuickClientChange("languages", event.target.value)}
                            placeholder="Espanol, Ingles, etc."
                          />
                        </div>
                      </div>

                      {quickClientError ? (
                        <div className="rounded-2xl border border-[#e8b6bc] bg-[#fff4f5] px-3 py-2 text-sm text-[#9d4d4d]">
                          {quickClientError}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setQuickClientOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="button" onClick={handleQuickCreateClient} disabled={isPending}>
                          <Plus className="h-4 w-4" />
                          {isPending ? "Guardando..." : "Guardar cliente"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedClient ? (
                <div className="rounded-[24px] border border-border/70 bg-white/90 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{selectedClient.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[selectedClient.email, selectedClient.phone, selectedClient.taxId].filter(Boolean).join(" • ") ||
                      "Cliente seleccionado para este caso"}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Escribe para buscar un cliente existente o usa el boton de alta rapida.
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Nombre del caso</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={initialValues?.title ?? ""}
                placeholder="Ejemplo: Sucesion Perez o Reajuste previsional"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={initialValues?.description ?? ""}
                placeholder="Contexto breve del expediente, objetivo o notas operativas."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Gestion"
          title="Estado, prioridad y fechas"
          description="Configuracion minima para seguir el caso desde el panel sin sobrecargar el alta."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fee">Honorarios</Label>
              <CurrencyInput
                id="fee"
                name="fee"
                defaultValue={initialValues?.fee ?? ""}
                placeholder="Monto total pactado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredPaymentMethod">Metodo de cobro preferido</Label>
              <Input
                id="preferredPaymentMethod"
                name="preferredPaymentMethod"
                defaultValue={initialValues?.preferredPaymentMethod ?? ""}
                placeholder="Transferencia, efectivo, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                name="status"
                defaultValue={initialValues?.status ?? "ACTIVE"}
                className={selectClassName}
              >
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <select
                id="priority"
                name="priority"
                defaultValue={initialValues?.priority ?? "MEDIUM"}
                className={selectClassName}
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={initialValues?.startDate ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de cierre</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={initialValues?.endDate ?? ""} />
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            {submitLabel}
          </Button>
        </div>
      </form>

      <SectionCard
        eyebrow="Secuencia ideal"
        title="Como usar este flujo"
        description="Pensado para cargar rapido sin perder estructura."
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            1. Busca un cliente escribiendo directo en el selector.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            2. Si no existe, crealo desde el boton lateral y queda elegido automaticamente.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white/80 p-4">
            3. Guarda el caso y despues registra cobros y pagos parciales desde la ficha.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
