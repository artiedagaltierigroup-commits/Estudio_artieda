import { InfoPopover } from "@/components/system/info-popover";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderStat {
  label: string;
  value: ReactNode;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
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
        "overflow-hidden rounded-[32px] border border-border/80 bg-white p-6 shadow-[0_24px_60px_-52px_rgba(122,56,79,0.18)]",
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
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {title}
              </h1>
              {description ? <InfoPopover content={description} className="mt-1" /> : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>

      {stats.length > 0 ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-border/70 bg-white/90 px-4 py-3 shadow-[0_16px_42px_-36px_rgba(122,56,79,0.22)]"
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
