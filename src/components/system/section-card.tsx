import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription className="leading-6">{description}</CardDescription> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn("pt-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
