"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface HelpSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSuggestionSelect: (value: string) => void;
  suggestions: string[];
  resultCount: number;
  totalCount: number;
}

export function HelpSearch({
  query,
  onQueryChange,
  onSuggestionSelect,
  suggestions,
  resultCount,
  totalCount,
}: HelpSearchProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por pantalla, tarea o concepto. Ejemplo: cobro, gasto, registrar pago"
          className="h-14 rounded-[26px] border-border/80 bg-white/90 pl-12 pr-14 text-sm shadow-[0_18px_45px_-36px_rgba(122,56,79,0.35)]"
          aria-label="Buscar ayuda del sistema"
        />
        {query.trim() ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2"
            onClick={() => onQueryChange("")}
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? `${resultCount} resultado(s) sobre ${totalCount} entrada(s) de ayuda.`
            : `Explora ${totalCount} respuestas y accesos rapidos del sistema.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-white/80"
              onClick={() => onSuggestionSelect(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
