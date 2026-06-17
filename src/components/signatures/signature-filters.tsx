import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface SignatureFiltersProps {
  query: string;
  status: string;
  sort: string;
}

export function SignatureFilters({ query, status, sort }: SignatureFiltersProps) {
  const hasFilters = Boolean(query || status || (sort && sort !== "recent"));

  return (
    <form className="grid gap-3 border-b border-border/80 pb-5 xl:grid-cols-[minmax(0,1fr)_220px_190px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Buscar por asunto, destinatario o email"
          className="pl-10"
        />
      </div>

      <select name="status" defaultValue={status} className={selectClassName}>
        <option value="">Todos los estados</option>
        <option value="DRAFT">Borrador</option>
        <option value="READY">Lista para enviar</option>
        <option value="SENT">Enviadas</option>
        <option value="EMAIL_OPENED">Correo abierto</option>
        <option value="LINK_OPENED">Link abierto</option>
        <option value="DOCUMENT_VIEWED">Documento visto</option>
        <option value="SIGNING_STARTED">Firma iniciada</option>
        <option value="SIGNING_INTERRUPTED">Firma interrumpida</option>
        <option value="SIGNED">Firmadas</option>
        <option value="REJECTED">Rechazadas</option>
        <option value="EXPIRED">Vencidas</option>
        <option value="CANCELLED">Canceladas</option>
      </select>

      <select name="sort" defaultValue={sort || "recent"} className={selectClassName}>
        <option value="recent">Mas recientes</option>
        <option value="oldest">Mas antiguas</option>
        <option value="status">Por estado</option>
        <option value="recipient">Por destinatario</option>
      </select>

      <div className="flex gap-2">
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost">
            <Link href="/firmas">Limpiar</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
