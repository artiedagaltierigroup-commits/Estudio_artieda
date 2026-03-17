import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderStat {
  label: string;
  value: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: PageHeaderStat[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[32px] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(232,154,180,0.22),transparent_36%),radial-gradient(circle_at_top_right,rgba(201,182,228,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,251,0.94))] p-6 shadow-[0_28px_80px_-56px_rgba(135,92,111,0.5)]",
        className
      )}
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          {eyebrow ? (
            <span className="inline-flex rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/85">
              {eyebrow}
            </span>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>

      {stats.length > 0 ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_16px_42px_-34px_rgba(135,92,111,0.45)]"
            >
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground sm:text-base">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
