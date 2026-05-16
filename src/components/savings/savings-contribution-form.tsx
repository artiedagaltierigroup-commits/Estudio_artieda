import { SubmitButton } from "@/components/system/submit-button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyBank } from "lucide-react";

interface SavingsContributionFormProps {
  action: (formData: FormData) => void | Promise<void>;
  savingsGoalId: string;
  defaultDate: string;
}

export function SavingsContributionForm({
  action,
  savingsGoalId,
  defaultDate,
}: SavingsContributionFormProps) {
  return (
    <form action={action} className="grid gap-3 rounded-[22px] border border-border/70 bg-white/85 p-4 lg:grid-cols-[150px_150px_minmax(0,1fr)_auto]">
      <input type="hidden" name="savingsGoalId" value={savingsGoalId} />
      <div className="space-y-2">
        <Label htmlFor={`amount-${savingsGoalId}`}>Monto</Label>
        <CurrencyInput id={`amount-${savingsGoalId}`} name="amount" required placeholder="0" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`date-${savingsGoalId}`}>Fecha</Label>
        <Input id={`date-${savingsGoalId}`} name="contributionDate" type="date" required defaultValue={defaultDate} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`description-${savingsGoalId}`}>Descripcion</Label>
        <Input id={`description-${savingsGoalId}`} name="description" placeholder="Opcional" />
      </div>
      <div className="flex items-end">
        <SubmitButton className="w-full">
          <PiggyBank className="h-4 w-4" />
          Anadir
        </SubmitButton>
      </div>
    </form>
  );
}
