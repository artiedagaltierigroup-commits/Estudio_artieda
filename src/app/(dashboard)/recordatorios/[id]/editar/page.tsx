import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReminderReferences, getReminders, updateReminder } from "@/actions/reminders";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { SubmitButton } from "@/components/system/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass = "h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm";

function toBusinessDateTimeInput(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default async function EditReminderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [list, references] = await Promise.all([getReminders(), getReminderReferences()]);
  const reminder = list.find((item) => item.id === id);
  if (!reminder) notFound();

  async function save(formData: FormData) {
    "use server";
    const localDateTime = String(formData.get("reminderDate") ?? "");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) {
      formData.set("reminderDate", `${localDateTime}:00-03:00`);
    }
    const result = await updateReminder(id, formData);
    if (result.success) redirect("/recordatorios");
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Seguimiento" title="Editar recordatorio" description="Actualizá la tarea y su relación con un cliente o caso." actions={<Button asChild variant="outline"><Link href="/recordatorios">Volver</Link></Button>} />
    <SectionCard title={reminder.title}><form action={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required defaultValue={reminder.title} /></div>
        <div className="space-y-2"><Label htmlFor="reminderDate">Fecha y hora</Label><Input id="reminderDate" name="reminderDate" type="datetime-local" required defaultValue={toBusinessDateTimeInput(reminder.reminderDate)} /></div>
        <div className="space-y-2"><Label htmlFor="priority">Prioridad</Label><select id="priority" name="priority" defaultValue={reminder.priority} className={selectClass}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select></div>
        <div className="space-y-2"><Label htmlFor="clientId">Cliente</Label><select id="clientId" name="clientId" defaultValue={reminder.clientId ?? ""} className={selectClass}><option value="">General</option>{references.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="caseId">Caso</Label><select id="caseId" name="caseId" defaultValue={reminder.caseId ?? ""} className={selectClass}><option value="">Sin caso asociado</option>{references.cases.map((item) => <option key={item.id} value={item.id}>{item.clientName} - {item.title}</option>)}</select></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" name="description" defaultValue={reminder.description ?? ""} /></div>
      </div>
      <div className="flex justify-end gap-3"><Button asChild variant="outline"><Link href="/recordatorios">Cancelar</Link></Button><SubmitButton>Guardar cambios</SubmitButton></div>
    </form></SectionCard>
  </div>;
}
