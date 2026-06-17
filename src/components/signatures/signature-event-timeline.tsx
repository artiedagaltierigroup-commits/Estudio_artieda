import { StatusChip } from "@/components/system/status-chip";
import { formatDateTime } from "@/lib/utils";

interface SignatureEventTimelineProps {
  events: Array<{
    id: string;
    type: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>;
}

const eventLabels: Record<string, string> = {
  created: "Solicitud creada",
  document_uploaded: "Documento cargado",
  placement_selected: "Ubicacion de firma definida",
  sent: "Correo enviado",
  email_opened: "Correo abierto",
  link_opened: "Link abierto",
  document_viewed: "Documento visto",
  signing_started: "Firma iniciada",
  signing_interrupted: "Firma interrumpida",
  signed: "Documento firmado",
  rejected: "Solicitud rechazada",
  expired: "Solicitud vencida",
  cancelled: "Solicitud cancelada",
  resent: "Correo reenviado",
  downloaded: "Descarga realizada",
};

function getEventTone(type: string) {
  if (type === "signed") return "sage" as const;
  if (type === "rejected" || type === "expired" || type === "cancelled") return "danger" as const;
  if (type === "signing_interrupted") return "amber" as const;
  return "lilac" as const;
}

export function SignatureEventTimeline({ events }: SignatureEventTimelineProps) {
  if (events.length === 0) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">Todavia no hay eventos registrados.</div>;
  }

  return (
    <ol className="divide-y divide-border/80">
      {events.map((event) => (
        <li key={event.id} className="px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <StatusChip label={eventLabels[event.type] ?? event.type} tone={getEventTone(event.type)} />
              <div className="text-xs leading-5 text-muted-foreground">
                {event.ipAddress ? <p>IP: {event.ipAddress}</p> : null}
                {event.userAgent ? <p className="line-clamp-2">Dispositivo: {event.userAgent}</p> : null}
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{formatDateTime(event.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
