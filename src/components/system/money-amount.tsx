"use client";

import { formatDisplayCurrency } from "@/lib/money-visibility";
import { useMoneyVisibility } from "@/components/system/money-visibility-provider";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MoneyAmountProps {
  value: number | string | null | undefined;
  className?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function MoneyAmount({ value, className, prefix, suffix }: MoneyAmountProps) {
  const { isMoneyHidden } = useMoneyVisibility();

  return (
    <span className={cn(className)} suppressHydrationWarning>
      {prefix}
      {formatDisplayCurrency(value, isMoneyHidden)}
      {suffix}
    </span>
  );
}
