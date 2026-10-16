"use client";

import { useActionState, useState } from "react";
import { getBusinessDate } from "@/lib/business-date";
import { SubmitButton } from "@/components/system/submit-button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface PaymentFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  chargeId: string;
  paymentId: string;
  remainingBalance: number;
}

export function PaymentForm({ action, chargeId, paymentId }: PaymentFormProps) {
  const today = getBusinessDate();
  const [attemptId, setAttemptId] = useState(paymentId);
  const [fields, setFields] = useState({ paymentDate: today, method: "", notes: "" });
  const [result, submitPayment] = useActionState(async (_previous: { success?: boolean; error?: string }, formData: FormData) => {
    try {
      const response = await action(formData);
      if (response.success) {
        setAttemptId(crypto.randomUUID());
        setFields({ paymentDate: today, method: "", notes: "" });
      }
      return response;
    } catch {
      // Keep the same identifier if the server's response was lost: retrying cannot double the payment.
      return { error: "No se pudo confirmar el pago. Reintentá con los mismos datos para comprobarlo sin duplicarlo." };
    }
  }, {});

  return (
    <form action={submitPayment} className="space-y-4">
      <input type="hidden" name="chargeId" value={chargeId} />
      <input type="hidden" name="paymentId" value={attemptId} />
      {result.error && <p role="alert" className="text-sm text-destructive">{result.error}</p>}
      {result.success && <p role="status" className="text-sm text-muted-foreground">Pago registrado.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto a registrar</Label>
          <CurrencyInput
            key={attemptId}
            id="amount"
            name="amount"
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDate">Fecha de pago</Label>
          <Input id="paymentDate" name="paymentDate" type="date" value={fields.paymentDate}
            onChange={(event) => setFields({ ...fields, paymentDate: event.target.value })} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Metodo</Label>
          <Input id="method" name="method" placeholder="Transferencia, efectivo, etc." value={fields.method}
            onChange={(event) => setFields({ ...fields, method: event.target.value })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observacion</Label>
          <Textarea id="notes" name="notes" placeholder="Nota interna sobre el pago." value={fields.notes}
            onChange={(event) => setFields({ ...fields, notes: event.target.value })} />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton>
          <Save className="h-4 w-4" />
          Registrar pago
        </SubmitButton>
      </div>
    </form>
  );
}
