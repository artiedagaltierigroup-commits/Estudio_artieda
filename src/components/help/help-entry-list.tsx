import { Button } from "@/components/ui/button";
import { helpModules, type HelpEntry } from "@/lib/help-center";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const kindLabels: Record<HelpEntry["kind"], string> = {
  screen: "Pantalla",
  task: "Como hacer",
  concept: "Concepto",
};

const kindClassNames: Record<HelpEntry["kind"], string> = {
  screen: "border-[#c8d9f6] bg-[#eef4ff] text-[#35507c]",
  task: "border-[#ead8c0] bg-[#fff7ea] text-[#8a6131]",
  concept: "border-[#d8e7d8] bg-[#edf8ee] text-[#48745f]",
};

export function HelpEntryList({ entries }: { entries: HelpEntry[] }) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const moduleLabel = helpModules.find((item) => item.id === entry.module)?.label ?? entry.module;

        return (
          <article
            key={entry.id}
            className="rounded-[26px] border border-border/70 bg-white/90 p-5 shadow-[0_22px_55px_-44px_rgba(122,56,79,0.3)]"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
                  <span className={`rounded-full border px-3 py-1 ${kindClassNames[entry.kind]}`}>{kindLabels[entry.kind]}</span>
                  <span className="rounded-full border border-border/80 bg-background px-3 py-1 text-muted-foreground">
                    {moduleLabel}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">{entry.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{entry.summary}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{entry.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.keywords.slice(0, 4).map((keyword) => (
                    <span
                      key={`${entry.id}-${keyword}`}
                      className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <Button asChild variant="outline" className="shrink-0">
                <Link href={entry.href}>
                  Abrir modulo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
