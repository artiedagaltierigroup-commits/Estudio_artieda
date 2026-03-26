import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface PaymentFormProps {
  action: (formData: FormData) => void | Promise<void>;
  chargeId: string;
  remainingBalance: number;
}

export function PaymentForm({ action, chargeId, remainingBalance }: PaymentFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="chargeId" value={chargeId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto a registrar</Label>
          <CurrencyInput
            id="amount"
            name="amount"
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDate">Fecha de pago</Label>
          <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Metodo</Label>
          <Input id="method" name="method" placeholder="Transferencia, efectivo, etc." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observacion</Label>
          <Textarea id="notes" name="notes" placeholder="Nota interna sobre el pago." />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          <Save className="h-4 w-4" />
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
