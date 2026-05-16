"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  pendingLabel?: ReactNode;
}

export function SubmitButton({
  children,
  disabled,
  pendingLabel = "Guardando...",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button type="submit" disabled={isDisabled} aria-disabled={isDisabled ? "true" : undefined} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
