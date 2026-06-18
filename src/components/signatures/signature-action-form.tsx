"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

type SignatureActionResult = {
  success?: boolean;
  error?: string;
};

interface SignatureActionFormProps {
  action: () => Promise<SignatureActionResult | void>;
  children: ReactNode;
  pendingLabel: ReactNode;
  successMessage: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function SignatureActionForm({
  action,
  children,
  pendingLabel,
  successMessage,
  variant,
  size,
}: SignatureActionFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await action();

      if (result?.error) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      setIsError(false);
      setMessage(successMessage);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Button type="submit" variant={variant} size={size} disabled={pending} aria-disabled={pending ? "true" : undefined}>
        {pending ? pendingLabel : children}
      </Button>
      {message ? (
        <p
          className={isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
