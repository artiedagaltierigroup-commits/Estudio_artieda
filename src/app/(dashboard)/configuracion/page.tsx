import { PageHeader } from "@/components/system/page-header";
import { SectionCard } from "@/components/system/section-card";
import { StatusChip } from "@/components/system/status-chip";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferencias"
        title="Configuracion"
        description="Espacio reservado para los ajustes del sistema. En esta fase dejamos visible la estructura para no mezclar todavia logica avanzada con layout."
        stats={[
          { label: "Estado", value: "Base preparada" },
          { label: "Objetivo", value: "Centralizar preferencias" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          eyebrow="Cobros"
          title="Metodos y reglas"
          description="Aca despues van a vivir medios de cobro, preferencias operativas y alertas relacionadas."
        >
          <div className="space-y-3">
            <StatusChip label="Pendiente de implementacion" tone="amber" />
            <p className="text-sm leading-6 text-muted-foreground">
              Preparado para reglas de alertas, formas de cobro y ajustes de seguimiento.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Gastos"
          title="Categorias y comportamiento"
          description="Base para definir clasificaciones y decisiones que afecten el analisis financiero."
        >
          <div className="space-y-3">
            <StatusChip label="Pendiente de implementacion" tone="amber" />
            <p className="text-sm leading-6 text-muted-foreground">
              Ideal para categorias personalizadas, parametros de proyeccion y preferencias visuales.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Cuenta"
          title="Datos de la usuaria"
          description="Lugar natural para perfil, backup, exportacion y futuras preferencias del estudio."
        >
          <div className="space-y-3">
            <StatusChip label="Pendiente de implementacion" tone="amber" />
            <p className="text-sm leading-6 text-muted-foreground">
              La estructura ya esta lista para enchufar estos modulos sin rehacer navegacion ni layout.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
