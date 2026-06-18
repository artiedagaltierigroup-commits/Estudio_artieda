"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCase } from "@/actions/cases";
import { Button } from "@/components/ui/button";

interface CaseDeleteButtonProps {
  caseId: string;
  caseTitle: string;
}

export function CaseDeleteButton({ caseId, caseTitle }: CaseDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Eliminar "${caseTitle}"? Se eliminara este caso y sus cobros/pagos asociados. Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCase(caseId);
      if (result?.error) {
        window.alert(result.error);
        return;
      }

      router.push("/casos");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleDelete} disabled={isPending}>
      <Trash2 className="h-4 w-4" />
      {isPending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}
