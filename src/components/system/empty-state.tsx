import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="overflow-hidden border-dashed border-primary/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.2))]">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/12 text-[#8f4e68]">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </Card>
  );
}
