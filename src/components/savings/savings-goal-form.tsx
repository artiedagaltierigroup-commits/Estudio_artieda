import { SectionCard } from "@/components/system/section-card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface SavingsGoalFormProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function SavingsGoalForm({ action }: SavingsGoalFormProps) {
  return (
    <form action={action}>
      <SectionCard
        eyebrow="Nueva meta"
        title="Crear ahorro"
        description="Define una meta y empieza a separar dinero sin perder impacto en caja."
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Ejemplo: reserva fiscal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Meta</Label>
            <CurrencyInput id="targetAmount" name="targetAmount" required placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Fecha limite</Label>
            <Input id="deadline" name="deadline" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea id="description" name="description" placeholder="Detalle opcional para recordar el objetivo." />
          </div>
          <div className="flex justify-end">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Guardar ahorro
            </Button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
