import { getToneStyles, type VisualTone } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface StatusChipProps {
  label: string;
  tone: VisualTone;
  className?: string;
}

export function StatusChip({ label, tone, className }: StatusChipProps) {
  const styles = getToneStyles(tone);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        styles.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
