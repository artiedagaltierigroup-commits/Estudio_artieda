import { getCalendarEvents } from "@/actions/calendar";
import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { getCalendarEventLabel, getCalendarEventTone } from "@/lib/module-presenters";
import { buildCalendarMonth } from "@/lib/operations-insights";
import { formatCurrency } from "@/lib/utils";
import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const referenceDate = params.month
    ? parse(`${params.month}-01`, "yyyy-MM-dd", new Date())
    : new Date();
  const from = format(startOfMonth(referenceDate), "yyyy-MM-dd");
  const to = format(endOfMonth(referenceDate), "yyyy-MM-dd");
  const events = await getCalendarEvents(from, to);
  const weeks = buildCalendarMonth(referenceDate, events);
  const activeDays = weeks.flat().filter((day) => day.events.length > 0).length;
  const nextSevenEvents = events.slice(0, 8);
  const previousMonth = format(addMonths(referenceDate, -1), "yyyy-MM");
  const nextMonth = format(addMonths(referenceDate, 1), "yyyy-MM");
  const monthLabel = format(referenceDate, "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda financiera"
        title="Calendario"
        description="Vista mensual para cruzar vencimientos de cobro, recordatorios y gastos sin salir del panel."
        stats={[
          { label: "Mes", value: monthLabel },
          { label: "Eventos", value: `${events.length}` },
          { label: "Dias activos", value: `${activeDays}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/calendario?month=${previousMonth}`}>
                <ChevronLeft className="h-4 w-4" />
                Mes anterior
              </Link>
            </Button>
            <div className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-foreground">
              {monthLabel}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/calendario?month=${nextMonth}`}>
                Mes siguiente
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <SectionCard
        eyebrow="Referencias"
        title="Leyenda de eventos"
        description="Cada tipo mantiene el mismo tono visual que usa el resto del sistema."
        contentClassName="flex flex-wrap gap-3"
      >
        {["charge", "reminder", "expense", "recurring"].map((type) => (
          <StatusChip key={type} label={getCalendarEventLabel(type)} tone={getCalendarEventTone(type)} />
        ))}
      </SectionCard>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No hay eventos en este mes"
          description="Cuando existan cobros, recordatorios o gastos en la ventana actual, van a aparecer aca con una vista mensual real."
        />
      ) : (
        <div className="space-y-6">
          <SectionCard
            eyebrow="Vista mensual"
            title="Vista mensual"
            description="Cada celda muestra hasta tres eventos y mantiene acceso directo al modulo relacionado."
            contentClassName="space-y-4"
          >
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="rounded-[18px] border border-border/70 bg-muted/20 px-3 py-2 text-center text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {weeks.map((week, index) => (
                <div key={index} className="grid grid-cols-7 gap-2">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={[
                        "min-h-[138px] rounded-[24px] border px-3 py-3 shadow-[0_18px_50px_-40px_rgba(135,92,111,0.42)]",
                        day.isCurrentMonth
                          ? "border-border/70 bg-white/85"
                          : "border-border/50 bg-muted/15 text-muted-foreground",
                        day.events.length > 0 ? "ring-1 ring-[#f1d0db]/70" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={[
                            "text-sm font-semibold",
                            day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/80",
                          ].join(" ")}
                        >
                          {day.dayNumber}
                        </p>
                        {day.events.length > 0 ? (
                          <span className="rounded-full bg-[#f7d6e0] px-2 py-0.5 text-[0.68rem] font-semibold text-[#9a4e69]">
                            {day.events.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {day.events.slice(0, 3).map((event) => (
                          <Link
                            key={event.id}
                            href={event.href ?? "/calendario"}
                            className="block rounded-[18px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.14))] px-3 py-2 transition hover:border-[#d7b4c2]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-xs font-medium text-foreground">{event.title}</p>
                              <StatusChip
                                label={getCalendarEventLabel(event.type)}
                                tone={getCalendarEventTone(event.type)}
                              />
                            </div>
                            {event.amount !== undefined ? (
                              <p className="mt-1 text-[0.72rem] font-semibold text-[#9a4e69]">{formatCurrency(event.amount)}</p>
                            ) : null}
                          </Link>
                        ))}
                        {day.events.length > 3 ? (
                          <p className="px-1 text-[0.72rem] font-medium text-muted-foreground">
                            +{day.events.length - 3} evento(s) mas
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Proximos movimientos"
            title="Agenda cercana"
            description="Los primeros eventos del mes para operar rapido sin leer toda la grilla."
            contentClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            {nextSevenEvents.map((event) => (
              <Link
                key={event.id}
                href={event.href ?? "/calendario"}
                className="block rounded-[24px] border border-border/70 bg-white/85 px-4 py-4 shadow-[0_18px_50px_-40px_rgba(135,92,111,0.42)] transition hover:border-[#d7b4c2]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {format(new Date(`${event.date}T00:00:00`), "dd MMM", { locale: es })}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{event.title}</p>
                    {event.subtitle ? <p className="mt-1 text-xs text-muted-foreground">{event.subtitle}</p> : null}
                  </div>
                  <StatusChip label={getCalendarEventLabel(event.type)} tone={getCalendarEventTone(event.type)} />
                </div>
                {event.amount !== undefined ? (
                  <p className="mt-2 text-sm font-semibold text-[#9a4e69]">{formatCurrency(event.amount)}</p>
                ) : null}
              </Link>
            ))}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
