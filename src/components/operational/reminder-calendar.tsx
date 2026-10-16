import Link from "next/link";
import { addMonths, format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getReminders } from "@/actions/reminders";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { buildCalendarMonth } from "@/lib/operations-insights";
import { formatDateTime } from "@/lib/utils";
import { getBusinessDate } from "@/lib/business-date";

export async function ReminderCalendar({ month }: { month?: string }) {
  const parsed = month && /^\d{4}-\d{2}$/.test(month) ? parse(`${month}-01`, "yyyy-MM-dd", new Date()) : new Date();
  const reference = isValid(parsed) ? parsed : new Date();
  const selectedMonth = format(reference, "yyyy-MM");
  const reminders = (await getReminders()).filter((item) => !item.completed && getBusinessDate(item.reminderDate).startsWith(selectedMonth));
  const events = reminders.map((item) => ({ id: item.id, title: item.title, date: getBusinessDate(item.reminderDate), type: "reminder" }));
  const weeks = buildCalendarMonth(reference, events);
  return <div className="space-y-6">
    <PageHeader eyebrow="Agenda del estudio" title="Calendario" description="Fechas de las tareas y los recordatorios pendientes." stats={[{ label: "Mes", value: format(reference, "MMMM yyyy", { locale: es }) }, { label: "Recordatorios", value: reminders.length }]} actions={<>
      <Button asChild variant="outline" size="sm"><Link href={`/calendario?month=${format(addMonths(reference, -1), "yyyy-MM")}`}><ChevronLeft className="h-4 w-4" />Anterior</Link></Button>
      <Button asChild variant="outline" size="sm"><Link href={`/calendario?month=${format(addMonths(reference, 1), "yyyy-MM")}`}>Siguiente<ChevronRight className="h-4 w-4" /></Link></Button>
    </>} />
    <SectionCard title="Agenda mensual" contentClassName="overflow-x-auto">
      <div className="min-w-[680px] space-y-2"><div className="grid grid-cols-7 gap-2">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}</div>
        {weeks.map((week, index) => <div key={index} className="grid grid-cols-7 gap-2">{week.map((day) => <div key={day.dateKey} className={`min-h-28 rounded-2xl border p-3 ${day.isCurrentMonth ? "bg-white" : "bg-muted/20 text-muted-foreground"}`}>
          <p className={`text-sm font-semibold ${day.isToday ? "text-primary" : ""}`}>{day.dayNumber}</p>
          {day.events.map((event) => <Link key={event.id} href={`/recordatorios/${event.id}/editar`} className="mt-2 block rounded-xl bg-primary/10 p-2 text-xs text-primary">{event.title}</Link>)}
        </div>)}</div>)}
      </div>
    </SectionCard>
    <SectionCard title="Recordatorios del mes" contentClassName="space-y-3">{reminders.length ? reminders.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime()).map((item) => <Link key={item.id} href={`/recordatorios/${item.id}/editar`} className="flex flex-wrap justify-between gap-2 rounded-2xl border p-4 text-sm"><span>{item.title}</span><span className="text-muted-foreground">{formatDateTime(item.reminderDate)}</span></Link>) : <p className="text-sm text-muted-foreground">No hay recordatorios pendientes en este mes.</p>}</SectionCard>
  </div>;
}
