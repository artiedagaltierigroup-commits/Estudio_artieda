import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, Briefcase, ChevronRight, PencilLine, Plus, Users } from "lucide-react";
import { getOperationalClient, getOperationalClients, getOperationalCase, getOperationalCases } from "@/actions/operational";
import { getReminders } from "@/actions/reminders";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCaseStatusTone } from "@/lib/presentation";
import { sortRemindersForPanel, summarizeReminderPanel } from "@/lib/operations-insights";
import { formatDate, formatDateTime, getCaseStatusLabel, getPriorityLabel } from "@/lib/utils";

const rowClass = "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white p-4";
const selectClass = "h-11 rounded-2xl border border-input bg-background px-4 text-sm";

type ReminderSummary = { id: string; title: string; description: string | null; reminderDate: Date; completed: boolean; assigneeName?: string; creatorName?: string };
type CaseSummary = { id: string; title: string; status: string; priority: string };

function CaseList({ cases }: { cases: CaseSummary[] }) {
  return cases.length ? <div className="space-y-3">{cases.map((item) => (
    <Link key={item.id} href={`/casos/${item.id}`} className={rowClass}>
      <span className="font-medium">{item.title}</span>
      <span className="flex items-center gap-3"><StatusChip label={getCaseStatusLabel(item.status)} tone={getCaseStatusTone(item.status)} /><ChevronRight className="h-4 w-4" /></span>
    </Link>
  ))}</div> : <p className="text-sm text-muted-foreground">Todavía no hay casos asociados.</p>;
}

function ReminderList({ reminders }: { reminders: ReminderSummary[] }) {
  return reminders.length ? <div className="space-y-3">{reminders.map((item) => (
    <Link key={item.id} href={`/recordatorios/${item.id}/editar`} className={rowClass}>
      <div className="space-y-1"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.reminderDate)}</p>{item.assigneeName ? <p className="text-xs text-muted-foreground">Asignada a: {item.assigneeName} · Creada por: {item.creatorName}</p> : null}</div>
      <StatusChip label={item.completed ? "Completado" : "Pendiente"} tone={item.completed ? "sage" : "amber"} />
    </Link>
  ))}</div> : <p className="text-sm text-muted-foreground">No hay tareas para mostrar.</p>;
}

export async function OperationalHome() {
  const [clients, cases, reminders] = await Promise.all([getOperationalClients(), getOperationalCases(), getReminders()]);
  const summary = summarizeReminderPanel(reminders);
  const pending = sortRemindersForPanel(reminders.filter((item) => !item.completed)).slice(0, 8);
  return <div className="space-y-6">
    <PageHeader eyebrow="Estudio Artieda" title="Inicio" description="Clientes, expedientes y tareas compartidas del estudio." stats={[
      { label: "Clientes", value: clients.length },
      { label: "Casos activos", value: cases.filter((item) => item.status === "ACTIVE").length },
      { label: "Tareas pendientes", value: summary.pending },
      { label: "Para hoy", value: summary.dueToday },
    ]} />
    <div className="flex flex-wrap gap-3">
      <Button asChild><Link href="/casos/nuevo"><Plus className="h-4 w-4" />Nuevo caso</Link></Button>
      <Button asChild variant="outline"><Link href="/clientes/nuevo"><Users className="h-4 w-4" />Nuevo cliente</Link></Button>
      <Button asChild variant="outline"><Link href="/recordatorios"><Bell className="h-4 w-4" />Tareas</Link></Button>
    </div>
    <SectionCard title="Tareas pendientes" actions={<Link href="/recordatorios" className="text-sm text-primary hover:underline">Ver todas</Link>}><ReminderList reminders={pending} /></SectionCard>
    <SectionCard title="Casos activos"><CaseList cases={cases.filter((item) => item.status === "ACTIVE").slice(0, 8)} /></SectionCard>
  </div>;
}

export async function OperationalClientsPage({ query }: { query: string }) {
  const clients = await getOperationalClients(query);
  return <div className="space-y-6">
    <PageHeader eyebrow="Directorio" title="Clientes" description="Datos de contacto, casos y seguimiento de todos los clientes del estudio." stats={[{ label: "Clientes visibles", value: clients.length }]} actions={<Button asChild><Link href="/clientes/nuevo"><Plus className="h-4 w-4" />Nuevo cliente</Link></Button>} />
    <form action="/clientes" className="flex flex-wrap gap-3"><Input aria-label="Buscar clientes" name="q" defaultValue={query} placeholder="Nombre, email, teléfono o identificación" className="max-w-xl" /><Button type="submit" variant="outline">Buscar</Button></form>
    {clients.length ? <SectionCard title="Directorio del estudio" contentClassName="space-y-3">{clients.map((client) => <Link key={client.id} href={`/clientes/${client.id}`} className={rowClass}>
      <div className="min-w-0 space-y-1"><p className="font-semibold">{client.name}</p><p className="break-words text-sm text-muted-foreground">{[client.email, client.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p></div>
      <span className="flex items-center gap-3 text-sm text-muted-foreground">{client.cases.length} caso(s)<ChevronRight className="h-4 w-4" /></span>
    </Link>)}</SectionCard> : <EmptyState icon={Users} title="No hay clientes para mostrar" description="Probá otra búsqueda o agregá el primer cliente." />}
  </div>;
}

export async function OperationalClientPage({ id }: { id: string }) {
  const client = await getOperationalClient(id);
  if (!client) notFound();
  const contact = [{ label: "Email", value: client.email }, { label: "Teléfono", value: client.phone }, { label: "Dirección", value: client.address }, { label: "Idiomas", value: client.languages }, { label: "Identificación", value: client.taxId }];
  return <div className="space-y-6">
    <PageHeader eyebrow="Ficha del cliente" title={client.name} description="Contacto, expedientes y tareas compartidas." actions={<><Button asChild variant="outline"><Link href="/clientes">Volver</Link></Button><Button asChild><Link href={`/clientes/${id}/editar`}><PencilLine className="h-4 w-4" />Editar cliente</Link></Button></>} />
    <SectionCard title="Datos de contacto"><dl className="grid gap-4 sm:grid-cols-2">{contact.map((item) => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 break-words text-sm">{item.value || "Sin registrar"}</dd></div>)}</dl></SectionCard>
    {client.notes ? <SectionCard title="Notas internas"><p className="whitespace-pre-wrap break-words text-sm">{client.notes}</p></SectionCard> : null}
    <SectionCard title="Casos" actions={<Button asChild variant="outline"><Link href={`/casos/nuevo?clientId=${id}`}><Plus className="h-4 w-4" />Nuevo caso</Link></Button>}><CaseList cases={client.cases} /></SectionCard>
    <SectionCard title="Tareas"><ReminderList reminders={client.reminders} /></SectionCard>
    <Button asChild variant="outline"><Link href={`/firmas/nueva?clientId=${id}`}>Nueva solicitud de firma</Link></Button>
  </div>;
}

export async function OperationalCasesPage({ query, status }: { query: string; status: string }) {
  const cases = await getOperationalCases({ query, status });
  return <div className="space-y-6">
    <PageHeader eyebrow="Expedientes" title="Casos" description="Casos del estudio, con su estado y prioridad." stats={[{ label: "Casos visibles", value: cases.length }]} actions={<Button asChild><Link href="/casos/nuevo"><Plus className="h-4 w-4" />Nuevo caso</Link></Button>} />
    <form action="/casos" className="flex flex-wrap gap-3"><Input aria-label="Buscar casos" name="q" defaultValue={query} placeholder="Buscar un caso" className="max-w-lg" /><select name="status" aria-label="Estado del caso" defaultValue={status} className={selectClass}><option value="">Todos los estados</option><option value="ACTIVE">Activos</option><option value="SUSPENDED">Suspendidos</option><option value="CLOSED">Cerrados</option></select><Button type="submit" variant="outline">Buscar</Button></form>
    {cases.length ? <SectionCard title="Expedientes del estudio" contentClassName="space-y-3">{cases.map((item) => <Link key={item.id} href={`/casos/${item.id}`} className={rowClass}>
      <div className="space-y-1"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.client?.name ?? "Sin cliente"} · Prioridad {getPriorityLabel(item.priority).toLowerCase()}</p></div>
      <span className="flex items-center gap-3"><StatusChip label={getCaseStatusLabel(item.status)} tone={getCaseStatusTone(item.status)} /><ChevronRight className="h-4 w-4" /></span>
    </Link>)}</SectionCard> : <EmptyState icon={Briefcase} title="No hay casos para mostrar" description="Probá otros filtros o creá un expediente." />}
  </div>;
}

export async function OperationalCasePage({ id }: { id: string }) {
  const item = await getOperationalCase(id);
  if (!item) notFound();
  return <div className="space-y-6">
    <PageHeader eyebrow="Expediente" title={item.title} description={`Cliente: ${item.client?.name ?? "Sin cliente"}`} stats={[
      { label: "Estado", value: getCaseStatusLabel(item.status) }, { label: "Prioridad", value: getPriorityLabel(item.priority) },
      { label: "Inicio", value: formatDate(item.startDate) }, { label: "Cierre", value: formatDate(item.endDate) },
    ]} actions={<><Button asChild variant="outline"><Link href="/casos">Volver</Link></Button><Button asChild><Link href={`/casos/${id}/editar`}><PencilLine className="h-4 w-4" />Editar caso</Link></Button></>} />
    <SectionCard title="Contexto del caso"><p className="whitespace-pre-wrap break-words text-sm">{item.description || "Sin descripción registrada."}</p>{item.client ? <Link href={`/clientes/${item.client.id}`} className="mt-4 inline-block text-sm text-primary hover:underline">Ver ficha de {item.client.name}</Link> : null}</SectionCard>
    <SectionCard title="Tareas"><ReminderList reminders={item.reminders} /></SectionCard>
    <Button asChild variant="outline"><Link href={`/firmas/nueva?clientId=${item.clientId}&caseId=${id}`}>Nueva solicitud de firma</Link></Button>
  </div>;
}

export function OperationalHelp() {
  return <div className="space-y-6">
    <PageHeader eyebrow="Guía del estudio" title="Ayuda" description="Cómo trabajar con los módulos compartidos." />
    {[
      { title: "Clientes", href: "/clientes", text: "Consultá y actualizá los datos de contacto y las notas internas. Creá un cliente antes de abrir su primer caso." },
      { title: "Casos", href: "/casos", text: "Buscá expedientes por nombre o estado. Podés crear casos y editar su cliente, descripción, prioridad y fechas." },
      { title: "Tareas", href: "/recordatorios", text: "Registrá tareas generales o vinculadas a un cliente o caso. Editalas, marcalas como resueltas o reabrilas cuando haga falta. El calendario muestra sus fechas." },
      { title: "Firmas", href: "/firmas", text: "Prepará solicitudes, revisá su estado y accedé a los documentos del estudio desde el centro de firmas." },
    ].map((item) => <SectionCard key={item.href} title={item.title} actions={<Link href={item.href} className="text-sm text-primary hover:underline">Abrir módulo</Link>}><p className="text-sm leading-6 text-muted-foreground">{item.text}</p></SectionCard>)}
  </div>;
}
