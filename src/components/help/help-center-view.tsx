"use client";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { filterHelpEntries, helpEntries, helpModules } from "@/lib/help-center";
import { BookOpenText, CircleHelp, ListChecks, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { HelpEntryList } from "./help-entry-list";
import { HelpModuleGrid } from "./help-module-grid";
import { HelpSearch } from "./help-search";

const helpSuggestions = ["cobro", "registrar pago", "gasto", "estado de caso", "recordatorio"];

export function HelpCenterView() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const hasQuery = deferredQuery.trim().length > 0;
  const filteredEntries = filterHelpEntries(helpEntries, deferredQuery);
  const visibleModules = hasQuery
    ? helpModules.filter((module) => filteredEntries.some((entry) => entry.module === module.id))
    : helpModules;

  const screenEntries = filteredEntries.filter((entry) => entry.kind === "screen");
  const taskEntries = filteredEntries.filter((entry) => entry.kind === "task");
  const conceptEntries = filteredEntries.filter((entry) => entry.kind === "concept");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ayuda"
        title="Guia del sistema"
        description="Centro de consulta rapida para entender pantallas, tareas y conceptos operativos sin salir del dashboard."
        stats={[
          { label: "Modulos", value: `${helpModules.length}` },
          { label: "Pantallas", value: `${helpEntries.filter((entry) => entry.kind === "screen").length}` },
          { label: "Tareas", value: `${helpEntries.filter((entry) => entry.kind === "task").length}` },
          { label: "Conceptos", value: `${helpEntries.filter((entry) => entry.kind === "concept").length}` },
        ]}
      />

      <SectionCard
        eyebrow="Busqueda"
        title="Encontrar una respuesta rapida"
        description="Busca por nombre de pantalla, tarea frecuente o concepto del sistema."
        contentClassName="space-y-5"
      >
        <div className="max-w-3xl space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Esta pantalla reemplaza a la configuracion como punto de consulta. Sirve para descubrir modulos, entender estados
            y resolver dudas comunes como cargar un cobro, registrar un pago o crear un gasto.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background px-3 py-1">Guia por modulo</span>
            <span className="rounded-full border border-border/70 bg-background px-3 py-1">Tareas frecuentes</span>
            <span className="rounded-full border border-border/70 bg-background px-3 py-1">Estados y tipos</span>
          </div>
        </div>

        <HelpSearch
          query={query}
          onQueryChange={setQuery}
          onSuggestionSelect={setQuery}
          suggestions={helpSuggestions}
          resultCount={filteredEntries.length}
          totalCount={helpEntries.length}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Pantallas"
        title={hasQuery ? "Modulos relacionados con la busqueda" : "Accesos por modulo"}
        description="Cada tarjeta te lleva directo a la pantalla correspondiente del sistema."
      >
        <HelpModuleGrid modules={visibleModules} />
      </SectionCard>

      {hasQuery ? (
        filteredEntries.length > 0 ? (
          <SectionCard
            eyebrow="Resultados"
            title={`Coincidencias para "${deferredQuery.trim()}"`}
            description="Se muestran respuestas vinculadas a la busqueda actual."
          >
            <HelpEntryList entries={filteredEntries} />
          </SectionCard>
        ) : (
          <EmptyState
            icon={Search}
            title="No encontre una respuesta con esa busqueda"
            description="Proba con palabras mas generales como cobro, gasto, caso, recordatorio o estado."
          />
        )
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="Tareas"
              title="Preguntas frecuentes"
              description="Pasos cortos para resolver acciones del dia a dia dentro del sistema."
            >
              <HelpEntryList entries={taskEntries} />
            </SectionCard>

            <SectionCard
              eyebrow="Conceptos"
              title="Estados y tipos del sistema"
              description="Lectura rapida para interpretar datos y paneles sin ambiguedad."
            >
              <HelpEntryList entries={conceptEntries} />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
            <SectionCard
              eyebrow="Pantallas"
              title="Que hace cada modulo"
              description="Mapa rapido para saber donde conviene entrar segun la necesidad."
            >
              <HelpEntryList entries={screenEntries} />
            </SectionCard>

            <SectionCard
              eyebrow="Uso sugerido"
              title="Como aprovechar esta guia"
              description="Atajos mentales para usar la ayuda sin perder tiempo."
              contentClassName="space-y-4"
            >
              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CircleHelp className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cuando no sepas adonde ir</p>
                    <p className="text-sm leading-6 text-muted-foreground">Busca el nombre del problema o explora las pantallas del sistema.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4e5] text-[#8a6131]">
                    <ListChecks className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Para tareas operativas</p>
                    <p className="text-sm leading-6 text-muted-foreground">Busca verbos como crear, cargar, registrar o revisar.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf8ee] text-[#48745f]">
                    <BookOpenText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Para interpretar un dato</p>
                    <p className="text-sm leading-6 text-muted-foreground">Busca estado, tipo, recurrente o vencido para abrir definiciones rapidas.</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
