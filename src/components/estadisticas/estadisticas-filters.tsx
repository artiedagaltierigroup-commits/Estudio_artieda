import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";

const selectClassName =
  "flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface StatisticsFiltersProps {
  filters: {
    from: string;
    to: string;
    clientId: string;
    caseId: string;
  };
  options: {
    clients: Array<{ id: string; name: string }>;
    cases: Array<{ id: string; title: string; clientId: string; clientName: string }>;
  };
  presets: Array<{
    label: string;
    href: string;
    active: boolean;
  }>;
  compact?: boolean;
}

export function EstadisticasFilters({ filters, options, presets, compact = false }: StatisticsFiltersProps) {
  const filteredCases = filters.clientId
    ? options.cases.filter((item) => item.clientId === filters.clientId)
    : options.cases;

  if (compact) {
    return (
      <div className="w-full rounded-[24px] border border-border/70 bg-white/95 p-3 shadow-[0_18px_40px_-34px_rgba(122,56,79,0.16)]">
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset.label} asChild variant={preset.active ? "default" : "outline"} size="sm" className="h-9 rounded-full px-4">
              <Link href={preset.href}>{preset.label}</Link>
            </Button>
          ))}
        </div>

        <form className="grid gap-2.5 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Desde
            </Label>
            <Input id="from" name="from" type="date" defaultValue={filters.from} className="h-9 rounded-2xl px-3 text-sm" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="to" className="text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Hasta
            </Label>
            <Input id="to" name="to" type="date" defaultValue={filters.to} className="h-9 rounded-2xl px-3 text-sm" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="clientId" className="text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Cliente
            </Label>
            <select id="clientId" name="clientId" defaultValue={filters.clientId} className={cn(selectClassName, "h-9 text-sm")}>
              <option value="">Todos los clientes</option>
              {options.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="caseId" className="text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Caso
            </Label>
            <select id="caseId" name="caseId" defaultValue={filters.caseId} className={cn(selectClassName, "h-9 text-sm")}>
              <option value="">Todos los casos</option>
              {filteredCases.map((currentCase) => (
                <option key={currentCase.id} value={currentCase.id}>
                  {currentCase.clientName} - {currentCase.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
            <Button type="submit" className="h-9 rounded-2xl px-4">
              Aplicar
            </Button>
            <Button asChild variant="ghost" className="h-9 rounded-2xl px-3">
              <Link href="/estadisticas">Limpiar</Link>
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-border/80 bg-white px-4 py-4 shadow-[0_20px_48px_-44px_rgba(122,56,79,0.22)]">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.15fr_1.15fr_auto] xl:items-end">
        <div className="space-y-1">
          <Label htmlFor="from" className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Desde
          </Label>
          <Input id="from" name="from" type="date" defaultValue={filters.from} className="h-10 rounded-2xl px-3" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="to" className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Hasta
          </Label>
          <Input id="to" name="to" type="date" defaultValue={filters.to} className="h-10 rounded-2xl px-3" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="clientId" className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Cliente
          </Label>
          <select id="clientId" name="clientId" defaultValue={filters.clientId} className={selectClassName}>
            <option value="">Todos los clientes</option>
            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="caseId" className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Caso
          </Label>
          <select id="caseId" name="caseId" defaultValue={filters.caseId} className={selectClassName}>
            <option value="">Todos los casos</option>
            {filteredCases.map((currentCase) => (
              <option key={currentCase.id} value={currentCase.id}>
                {currentCase.clientName} - {currentCase.title}
              </option>
            ))}
          </select>
        </div>

        <div className={cn("flex items-end gap-2 md:col-span-2 xl:col-span-1 xl:justify-end")}>
          <Button type="submit" className="h-10 rounded-2xl px-4">
            Aplicar
          </Button>
          <Button asChild variant="ghost">
            <Link href="/estadisticas">Limpiar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
