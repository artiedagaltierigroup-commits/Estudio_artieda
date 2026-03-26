"use client";

import { useMemo, useState } from "react";
import { formatMoneyInput, normalizeMoneyValue } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  id: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({
  id,
  name,
  defaultValue,
  placeholder,
  required,
  className,
  disabled,
}: CurrencyInputProps) {
  const [rawValue, setRawValue] = useState(() => normalizeMoneyValue(defaultValue));

  const displayValue = useMemo(() => formatMoneyInput(rawValue), [rawValue]);

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        onChange={(event) => setRawValue(normalizeMoneyValue(event.target.value))}
        placeholder={placeholder}
        required={required}
        className={className}
        disabled={disabled}
      />
      <input type="hidden" name={name} value={rawValue} />
    </>
  );
}
