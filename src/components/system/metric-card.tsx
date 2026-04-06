import { Card } from "@/components/ui/card";
import { InfoPopover } from "@/components/system/info-popover";
import { getToneStyles, type VisualTone } from "@/lib/presentation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subtitle?: string;
  hint?: string;
  icon: LucideIcon;
  tone: VisualTone;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  hint,
  icon: Icon,
  tone,
  className,
}: MetricCardProps) {
  const styles = getToneStyles(tone);

  return (
    <Card className={cn("overflow-hidden", styles.panel, className)}>
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </p>
              {subtitle ? <InfoPopover content={subtitle} /> : null}
            </div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
          </div>
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", styles.iconWrap)}>
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </span>
        </div>

        {hint ? <p className={cn("text-xs font-medium", styles.accent)}>{hint}</p> : null}
      </div>
    </Card>
  );
}
