export type HelpModuleId =
  | "dashboard"
  | "clientes"
  | "casos"
  | "cobros"
  | "calendario"
  | "gastos"
  | "gastos-recurrentes"
  | "recordatorios"
  | "estadisticas"
  | "historial";

export type HelpEntryKind = "screen" | "task" | "concept";

export interface HelpModule {
  id: HelpModuleId;
  label: string;
  description: string;
  href: string;
}

export interface HelpEntry {
  id: string;
  module: HelpModuleId;
  kind: HelpEntryKind;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
  href: string;
}

export const helpModules: HelpModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Resumen operativo para abrir el dia y detectar prioridades.",
    href: "/",
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Base comercial y relacion activa con cada cliente.",
    href: "/clientes",
  },
  {
    id: "casos",
    label: "Casos",
    description: "Seguimiento juridico, estados y contexto de expedientes.",
    href: "/casos",
  },
  {
    id: "cobros",
    label: "Cobros",
    description: "Compromisos de cobro, pagos y seguimiento de deuda.",
    href: "/cobros",
  },
  {
    id: "calendario",
    label: "Calendario",
    description: "Vista temporal de vencimientos y movimiento cercano.",
    href: "/calendario",
  },
  {
    id: "gastos",
    label: "Gastos",
    description: "Registro de egresos reales y lectura del saldo disponible.",
    href: "/gastos",
  },
  {
    id: "gastos-recurrentes",
    label: "Gastos recurrentes",
    description: "Plantillas para egresos que se repiten en el tiempo.",
    href: "/gastos/recurrentes",
  },
  {
    id: "recordatorios",
    label: "Recordatorios",
    description: "Alertas internas y tareas pendientes para seguimiento.",
    href: "/recordatorios",
  },
  {
    id: "estadisticas",
    label: "Estadisticas",
    description: "Lectura financiera, tendencias y comparativos del estudio.",
    href: "/estadisticas",
  },
  {
    id: "historial",
    label: "Historial",
    description: "Linea de cambios recientes sobre entidades del sistema.",
    href: "/historial",
  },
];

export const helpEntries: HelpEntry[] = [
  {
    id: "screen-dashboard",
    module: "dashboard",
    kind: "screen",
    title: "Que muestra Dashboard",
    summary: "Resume pendientes, vencimientos y foco comercial del estudio.",
    content:
      "Usalo como punto de partida del dia. Muestra recordatorios, cobros a seguir, clientes con deuda y recomendaciones sobre donde conviene entrar despues.",
    keywords: ["inicio", "panel", "resumen", "dashboard", "prioridades"],
    href: "/",
  },
  {
    id: "screen-clientes",
    module: "clientes",
    kind: "screen",
    title: "Para que sirve Clientes",
    summary: "Concentra la ficha base, contacto y relacion comercial de cada cliente.",
    content:
      "Desde Clientes podes crear nuevas fichas, revisar casos asociados, ver proximos vencimientos y entrar al historial de cobros registrados por persona.",
    keywords: ["cliente", "contacto", "ficha", "agenda"],
    href: "/clientes",
  },
  {
    id: "screen-casos",
    module: "casos",
    kind: "screen",
    title: "Que resuelvo en Casos",
    summary: "Administra expedientes, estados juridicos y seguimiento financiero por caso.",
    content:
      "En Casos podes abrir expedientes, asignarlos a un cliente, marcar prioridad, definir honorarios y revisar los cobros y pagos asociados a cada caso.",
    keywords: ["caso", "expediente", "honorarios", "prioridad"],
    href: "/casos",
  },
  {
    id: "screen-cobros",
    module: "cobros",
    kind: "screen",
    title: "Que podes hacer en Cobros",
    summary: "Centraliza compromisos, deuda viva, vencimientos y pagos registrados.",
    content:
      "La pantalla de Cobros sirve para ver el estado financiero de cada compromiso, detectar deuda vencida y entrar a la ficha de cada cobro para registrar pagos o ajustar seguimiento.",
    keywords: ["cobro", "pagos", "deuda", "vencido", "seguimiento"],
    href: "/cobros",
  },
  {
    id: "screen-calendario",
    module: "calendario",
    kind: "screen",
    title: "Como leer Calendario",
    summary: "Ordena vencimientos y movimientos cercanos en una vista mensual.",
    content:
      "Calendario muestra eventos financieros por fecha para anticipar cobros, recordatorios y seguimientos que estan por entrar en agenda.",
    keywords: ["agenda", "mes", "fechas", "vencimientos", "calendario"],
    href: "/calendario",
  },
  {
    id: "screen-gastos",
    module: "gastos",
    kind: "screen",
    title: "Para que sirve Gastos",
    summary: "Registra egresos reales y permite leer el saldo disponible del mes.",
    content:
      "La vista de Gastos combina historial, saldo real, porcentaje consumido y egresos del periodo para entender cuanto de lo cobrado ya fue absorbido por costos.",
    keywords: ["gasto", "egreso", "saldo", "consumo", "historial"],
    href: "/gastos",
  },
  {
    id: "screen-gastos-recurrentes",
    module: "gastos-recurrentes",
    kind: "screen",
    title: "Que son los Gastos recurrentes",
    summary: "Plantillas de egresos repetitivos que ayudan a proyectar meses futuros.",
    content:
      "Usalos para servicios, abonos o pagos fijos. No reemplazan al gasto real del dia, sino que sirven como base para planificar y repetir cargas previsibles.",
    keywords: ["recurrente", "plantilla", "abono", "proyeccion"],
    href: "/gastos/recurrentes",
  },
  {
    id: "screen-recordatorios",
    module: "recordatorios",
    kind: "screen",
    title: "Como funciona Recordatorios",
    summary: "Organiza alertas internas generales o ligadas a clientes y casos.",
    content:
      "Recordatorios sirve como bandeja diaria. Prioriza vencidos, pendientes y tareas cercanas para que el seguimiento no dependa de memoria manual.",
    keywords: ["recordatorio", "alerta", "seguimiento", "pendiente"],
    href: "/recordatorios",
  },
  {
    id: "screen-estadisticas",
    module: "estadisticas",
    kind: "screen",
    title: "Que leo en Estadisticas",
    summary: "Expone rendimiento financiero, comparativos y evolucion del periodo.",
    content:
      "En Estadisticas podes revisar cobrado, saldo abierto, gastos, neto, ranking de clientes y graficos para detectar tendencia y rendimiento del estudio.",
    keywords: ["metricas", "graficos", "estadisticas", "neto", "cobrado"],
    href: "/estadisticas",
  },
  {
    id: "screen-historial",
    module: "historial",
    kind: "screen",
    title: "Para que sirve Historial",
    summary: "Muestra una linea de cambios recientes sobre entidades del sistema.",
    content:
      "Historial ayuda a entender que se creo, actualizo o elimino recientemente. Sirve para trazabilidad y para reconstruir movimientos operativos.",
    keywords: ["historial", "cambios", "trazabilidad", "movimientos"],
    href: "/historial",
  },
  {
    id: "task-crear-cliente",
    module: "clientes",
    kind: "task",
    title: "Como crear un cliente",
    summary: "Entra a Clientes y usa el alta base para completar la ficha inicial.",
    content:
      "Anda a Clientes, toca Nuevo cliente y completa nombre, contacto, notas o datos fiscales si hacen falta. Desde esa ficha despues vas a poder asociar casos y revisar cobros.",
    keywords: ["nuevo cliente", "alta cliente", "crear cliente", "ficha"],
    href: "/clientes/nuevo",
  },
  {
    id: "task-crear-caso",
    module: "casos",
    kind: "task",
    title: "Como crear un caso",
    summary: "Primero necesitas un cliente cargado y despues abrir el expediente.",
    content:
      "Anda a Casos, entra en Nuevo caso, elegi el cliente asociado, defini titulo, estado, prioridad y honorarios si corresponde. El caso queda listo para sumar cobros y recordatorios.",
    keywords: ["nuevo caso", "crear caso", "expediente", "alta caso"],
    href: "/casos/nuevo",
  },
  {
    id: "task-crear-cobro",
    module: "cobros",
    kind: "task",
    title: "Como cargar un cobro",
    summary: "El cobro se crea dentro del circuito de casos y queda listo para seguimiento.",
    content:
      "Anda a Cobros o entra desde un caso, usa Nuevo cobro y completa descripcion, monto total, vencimiento y fecha de seguimiento si queres controlar la gestion. El estado arranca como pendiente.",
    keywords: ["nuevo cobro", "crear cobro", "cargar cobro", "honorarios"],
    href: "/cobros/nuevo",
  },
  {
    id: "task-registrar-pago",
    module: "cobros",
    kind: "task",
    title: "Como registrar un pago",
    summary: "El pago se registra dentro de la ficha de un cobro existente.",
    content:
      "Entra a la ficha del cobro, usa Registrar pago y completa monto, fecha y metodo si queres dejarlo asentado. El sistema recalcula saldo y puede pasar el cobro a parcial o pagado.",
    keywords: ["registrar pago", "pago", "cobro parcial", "cobro pagado"],
    href: "/cobros",
  },
  {
    id: "task-crear-gasto",
    module: "gastos",
    kind: "task",
    title: "Como crear un gasto",
    summary: "Carga el egreso real con su tipo, categoria y fecha para impactar en el mes.",
    content:
      "Anda a Gastos, entra en Nuevo gasto y registra descripcion, monto, tipo, categoria y fecha. Si queres que cuente para un mes concreto tambien podes definir el mes de aplicacion.",
    keywords: ["nuevo gasto", "crear gasto", "egreso", "categoria"],
    href: "/gastos/nuevo",
  },
  {
    id: "task-crear-recordatorio",
    module: "recordatorios",
    kind: "task",
    title: "Como crear un recordatorio",
    summary: "Se crea desde Recordatorios y puede ser general o ligado a cliente o caso.",
    content:
      "Usa la seccion Nuevo recordatorio, elegi fecha y hora, prioridad y si corresponde vinculalo con un cliente o un caso para tener contexto operativo.",
    keywords: ["nuevo recordatorio", "crear recordatorio", "alerta", "tarea"],
    href: "/recordatorios",
  },
  {
    id: "concept-estados-caso",
    module: "casos",
    kind: "concept",
    title: "Estados de caso",
    summary: "Los casos hoy usan activo, cerrado y suspendido.",
    content:
      "Activo indica que el expediente sigue en curso. Cerrado se usa cuando ya termino. Suspendido sirve para casos pausados o a la espera, sin sacarlos del historial del cliente.",
    keywords: ["estado de caso", "activo", "cerrado", "suspendido"],
    href: "/casos",
  },
  {
    id: "concept-estados-cobro",
    module: "cobros",
    kind: "concept",
    title: "Estados de cobro",
    summary: "El sistema trabaja con pendiente, parcial, pagado y vencido, y tambien muestra cancelado como lectura derivada.",
    content:
      "Pendiente significa que no hay pagos aplicados. Parcial indica pago incompleto. Pagado marca saldo en cero. Vencido aparece cuando sigue abierto y ya paso la fecha. Cancelado surge cuando el cobro se anula y deja de computar como deuda viva.",
    keywords: ["estado de cobro", "pendiente", "parcial", "pagado", "vencido", "cancelado"],
    href: "/cobros",
  },
  {
    id: "concept-tipos-gasto",
    module: "gastos",
    kind: "concept",
    title: "Tipos de gasto",
    summary: "Los egresos se clasifican como operativo, impuesto, servicio u otro.",
    content:
      "Operativo cubre gasto cotidiano del estudio. Impuesto sirve para cargas fiscales. Servicio aplica a abonos o prestaciones. Otro deja registrar gastos que no entran bien en las categorias anteriores.",
    keywords: ["tipo de gasto", "operativo", "impuesto", "servicio", "otro"],
    href: "/gastos",
  },
  {
    id: "concept-gastos-recurrentes",
    module: "gastos-recurrentes",
    kind: "concept",
    title: "Diferencia entre gasto comun y recurrente",
    summary: "El gasto comun registra un hecho real; el recurrente funciona como plantilla de proyeccion.",
    content:
      "Un gasto comun impacta directo en el historial y en el saldo del periodo. Un gasto recurrente sirve para repetir o proyectar egresos fijos, como alquileres, plataformas o servicios del estudio.",
    keywords: ["gasto recurrente", "plantilla", "proyeccion", "gasto comun"],
    href: "/gastos/recurrentes",
  },
];

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterHelpEntries(entries: HelpEntry[], query: string) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return entries;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return entries.filter((entry) => {
    const haystack = normalizeForSearch(
      [
        entry.title,
        entry.summary,
        entry.content,
        entry.keywords.join(" "),
        entry.module,
        helpModules.find((item) => item.id === entry.module)?.label ?? "",
      ].join(" ")
    );

    return terms.every((term) => haystack.includes(term));
  });
}
