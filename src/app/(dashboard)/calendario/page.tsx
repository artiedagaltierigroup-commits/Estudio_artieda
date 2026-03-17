import { getCalendarEvents } from "@/actions/calendar";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { getCalendarEventLabel, getCalendarEventTone } from "@/lib/module-presenters";
import { formatCurrency } from "@/lib/utils";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

export default async function CalendarioPage() {
  const now = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to = format(endOfMonth(now), "yyyy-MM-dd");
  const events = await getCalendarEvents(from, to);

  const byDate: Record<string, typeof events> = {};
  for (const event of events) {
    if (!byDate[event.date]) byDate[event.date] = [];
    byDate[event.date].push(event);
  }

  const dates = Object.keys(byDate).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda financiera"
        title="Calendario"
        description="Vista mensual de cobros, recordatorios y gastos para detectar carga operativa y vencimientos del periodo."
        stats={[
          { label: "Mes", value: format(now, "MMMM yyyy", { locale: es }) },
          { label: "Eventos", value: `${events.length}` },
          { label: "Dias activos", value: `${dates.length}` },
        ]}
      />

      <SectionCard
        eyebrow="Referencias"
        title="Leyenda de eventos"
        description="Cada tipo mantiene el mismo tono visual que ya usa el resto del sistema."
        contentClassName="flex flex-wrap gap-3"
      >
        {["charge", "reminder", "expense", "recurring"].map((type) => (
          <StatusChip
            key={type}
            label={getCalendarEventLabel(type)}
            tone={getCalendarEventTone(type)}
          />
        ))}
      </SectionCard>

      {dates.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No hay eventos en este mes"
          description="Cuando existan cobros, recordatorios o gastos en la ventana actual, van a aparecer ordenados por dia."
        />
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <SectionCard
              key={date}
              eyebrow="Dia"
              title={format(new Date(`${date}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}
              description={`${byDate[date].length} evento(s) registrados para esta fecha.`}
              contentClassName="space-y-3"
            >
              {byDate[date].map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-white/85 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{event.title}</p>
                      <StatusChip
                        label={getCalendarEventLabel(event.type)}
                        tone={getCalendarEventTone(event.type)}
                      />
                    </div>
                    {event.subtitle ? <p className="text-sm text-muted-foreground">{event.subtitle}</p> : null}
                  </div>
                  {event.amount !== undefined ? (
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(event.amount)}</p>
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
