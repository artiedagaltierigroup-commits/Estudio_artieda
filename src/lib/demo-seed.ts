import { addDays, format, subDays, subMonths } from "date-fns";
import { randomUUID } from "crypto";

type DemoRowBase = {
  id: string;
  userId: string;
};

function makeId() {
  return randomUUID();
}

function asDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function makeTimestamp(value: Date) {
  return value;
}

export function buildDemoWorkspaceSeed(userId: string, now = new Date()) {
  const clientAnaId = makeId();
  const clientBrunoId = makeId();
  const clientClaraId = makeId();

  const caseSuccessionId = makeId();
  const caseContractId = makeId();
  const caseCollectionsId = makeId();
  const caseLaborId = makeId();

  const chargeSuccessionAdvanceId = makeId();
  const chargeSuccessionBalanceId = makeId();
  const chargeContractId = makeId();
  const chargeCollectionsId = makeId();
  const chargeLaborId = makeId();

  const clients: Array<
    DemoRowBase & {
      name: string;
      taxId: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: clientAnaId,
      userId,
      name: "Ana Beltran",
      taxId: "27-30111222-9",
      email: "ana.beltran@example.com",
      phone: "+54 9 11 4444-1122",
      address: "Av. Cabildo 2150, CABA",
      notes: "Cliente prolija, responde rapido y prefiere transferencias.",
      createdAt: makeTimestamp(subDays(now, 60)),
      updatedAt: makeTimestamp(subDays(now, 3)),
    },
    {
      id: clientBrunoId,
      userId,
      name: "Bruno Sosa",
      taxId: "20-28888444-7",
      email: "bruno.sosa@example.com",
      phone: "+54 9 11 5555-8844",
      address: null,
      notes: "Necesita seguimiento cercano en vencimientos.",
      createdAt: makeTimestamp(subDays(now, 45)),
      updatedAt: makeTimestamp(subDays(now, 2)),
    },
    {
      id: clientClaraId,
      userId,
      name: "Clara Dominguez",
      taxId: "27-25555666-1",
      email: "clara.dominguez@example.com",
      phone: "+54 9 11 6666-0001",
      address: "Vicente Lopez, Buenos Aires",
      notes: "Caso laboral con prioridad alta.",
      createdAt: makeTimestamp(subDays(now, 20)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  const cases: Array<
    DemoRowBase & {
      clientId: string;
      title: string;
      description: string | null;
      status: "ACTIVE" | "CLOSED" | "SUSPENDED";
      priority: "LOW" | "MEDIUM" | "HIGH";
      fee: string | null;
      preferredPaymentMethod: string | null;
      startDate: string | null;
      endDate: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: caseSuccessionId,
      userId,
      clientId: clientAnaId,
      title: "Sucesion familiar Perez",
      description: "Seguimiento integral del expediente sucesorio y administracion de pagos.",
      status: "ACTIVE",
      priority: "MEDIUM",
      fee: "420000.00",
      preferredPaymentMethod: "Transferencia bancaria",
      startDate: asDate(subDays(now, 55)),
      endDate: null,
      createdAt: makeTimestamp(subDays(now, 55)),
      updatedAt: makeTimestamp(subDays(now, 3)),
    },
    {
      id: caseContractId,
      userId,
      clientId: clientAnaId,
      title: "Revision de contrato comercial",
      description: "Revision y cierre contractual con una pyme cliente.",
      status: "CLOSED",
      priority: "LOW",
      fee: "180000.00",
      preferredPaymentMethod: "Transferencia bancaria",
      startDate: asDate(subDays(now, 80)),
      endDate: asDate(subDays(now, 15)),
      createdAt: makeTimestamp(subDays(now, 80)),
      updatedAt: makeTimestamp(subDays(now, 15)),
    },
    {
      id: caseCollectionsId,
      userId,
      clientId: clientBrunoId,
      title: "Cobro ejecutivo proveedor Delta",
      description: "Expediente de recupero con seguimiento semanal.",
      status: "ACTIVE",
      priority: "HIGH",
      fee: "360000.00",
      preferredPaymentMethod: "Efectivo o transferencia",
      startDate: asDate(subDays(now, 38)),
      endDate: null,
      createdAt: makeTimestamp(subDays(now, 38)),
      updatedAt: makeTimestamp(subDays(now, 2)),
    },
    {
      id: caseLaborId,
      userId,
      clientId: clientClaraId,
      title: "Despido indirecto y mediacion",
      description: "Caso laboral con proxima audiencia y alta prioridad.",
      status: "ACTIVE",
      priority: "HIGH",
      fee: "510000.00",
      preferredPaymentMethod: "Transferencia",
      startDate: asDate(subDays(now, 18)),
      endDate: null,
      createdAt: makeTimestamp(subDays(now, 18)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  const charges: Array<
    DemoRowBase & {
      caseId: string;
      description: string;
      amountTotal: string;
      dueDate: string | null;
      followUpDate: string | null;
      status: "PENDING";
      cancelledAt: Date | null;
      cancellationReason: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: chargeSuccessionAdvanceId,
      userId,
      caseId: caseSuccessionId,
      description: "Anticipo inicial",
      amountTotal: "150000.00",
      dueDate: asDate(subDays(now, 20)),
      followUpDate: asDate(subDays(now, 15)),
      status: "PENDING",
      cancelledAt: null,
      cancellationReason: null,
      notes: "Pagado en dos movimientos.",
      createdAt: makeTimestamp(subDays(now, 45)),
      updatedAt: makeTimestamp(subDays(now, 10)),
    },
    {
      id: chargeSuccessionBalanceId,
      userId,
      caseId: caseSuccessionId,
      description: "Saldo sucesion",
      amountTotal: "270000.00",
      dueDate: asDate(addDays(now, 12)),
      followUpDate: asDate(addDays(now, 8)),
      status: "PENDING",
      cancelledAt: null,
      cancellationReason: null,
      notes: "Pendiente de confirmacion con la familia.",
      createdAt: makeTimestamp(subDays(now, 12)),
      updatedAt: makeTimestamp(subDays(now, 2)),
    },
    {
      id: chargeContractId,
      userId,
      caseId: caseContractId,
      description: "Honorarios cierre contractual",
      amountTotal: "180000.00",
      dueDate: asDate(subDays(now, 25)),
      followUpDate: null,
      status: "PENDING",
      cancelledAt: null,
      cancellationReason: null,
      notes: "Cobro completo.",
      createdAt: makeTimestamp(subDays(now, 40)),
      updatedAt: makeTimestamp(subDays(now, 18)),
    },
    {
      id: chargeCollectionsId,
      userId,
      caseId: caseCollectionsId,
      description: "Tramo ejecutivo marzo",
      amountTotal: "220000.00",
      dueDate: asDate(subDays(now, 4)),
      followUpDate: asDate(addDays(now, 2)),
      status: "PENDING",
      cancelledAt: null,
      cancellationReason: null,
      notes: "Cliente prometio pago parcial esta semana.",
      createdAt: makeTimestamp(subDays(now, 16)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
    {
      id: chargeLaborId,
      userId,
      caseId: caseLaborId,
      description: "Preparacion audiencia",
      amountTotal: "310000.00",
      dueDate: asDate(addDays(now, 5)),
      followUpDate: asDate(addDays(now, 3)),
      status: "PENDING",
      cancelledAt: null,
      cancellationReason: null,
      notes: "Se espera pago antes de la audiencia.",
      createdAt: makeTimestamp(subDays(now, 8)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  const payments: Array<
    DemoRowBase & {
      chargeId: string;
      amount: string;
      paymentDate: string;
      method: string | null;
      notes: string | null;
      createdAt: Date;
    }
  > = [
    {
      id: makeId(),
      userId,
      chargeId: chargeSuccessionAdvanceId,
      amount: "80000.00",
      paymentDate: asDate(subDays(now, 18)),
      method: "Transferencia",
      notes: "Primer pago de anticipo.",
      createdAt: makeTimestamp(subDays(now, 18)),
    },
    {
      id: makeId(),
      userId,
      chargeId: chargeSuccessionAdvanceId,
      amount: "70000.00",
      paymentDate: asDate(subDays(now, 10)),
      method: "Transferencia",
      notes: "Completa anticipo.",
      createdAt: makeTimestamp(subDays(now, 10)),
    },
    {
      id: makeId(),
      userId,
      chargeId: chargeContractId,
      amount: "180000.00",
      paymentDate: asDate(subDays(now, 18)),
      method: "Transferencia",
      notes: "Cobro total.",
      createdAt: makeTimestamp(subDays(now, 18)),
    },
    {
      id: makeId(),
      userId,
      chargeId: chargeCollectionsId,
      amount: "50000.00",
      paymentDate: asDate(subDays(now, 1)),
      method: "Efectivo",
      notes: "Pago parcial de seguimiento.",
      createdAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  const expenses: Array<
    DemoRowBase & {
      description: string;
      amount: string;
      type: "OPERATIVE" | "TAX" | "SERVICE" | "OTHER";
      category: string | null;
      date: string;
      appliesToMonth: string | null;
      receiptUrl: string | null;
      voidedAt: Date | null;
      voidReason: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: makeId(),
      userId,
      description: "Monotributo",
      amount: "52000.00",
      type: "TAX",
      category: "Impuestos",
      date: asDate(subDays(now, 7)),
      appliesToMonth: asDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      receiptUrl: null,
      voidedAt: null,
      voidReason: null,
      notes: "Vencimiento mensual.",
      createdAt: makeTimestamp(subDays(now, 7)),
      updatedAt: makeTimestamp(subDays(now, 7)),
    },
    {
      id: makeId(),
      userId,
      description: "Internet estudio",
      amount: "38000.00",
      type: "SERVICE",
      category: "Servicios",
      date: asDate(subDays(now, 5)),
      appliesToMonth: asDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      receiptUrl: null,
      voidedAt: null,
      voidReason: null,
      notes: "Servicio fijo.",
      createdAt: makeTimestamp(subDays(now, 5)),
      updatedAt: makeTimestamp(subDays(now, 5)),
    },
    {
      id: makeId(),
      userId,
      description: "Papeleria y carpetas",
      amount: "16500.00",
      type: "OPERATIVE",
      category: "Oficina",
      date: asDate(subDays(now, 3)),
      appliesToMonth: asDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      receiptUrl: null,
      voidedAt: null,
      voidReason: null,
      notes: "Compra operativa de la semana.",
      createdAt: makeTimestamp(subDays(now, 3)),
      updatedAt: makeTimestamp(subDays(now, 3)),
    },
    {
      id: makeId(),
      userId,
      description: "Tasa de mediacion",
      amount: "48000.00",
      type: "OTHER",
      category: "Judicial",
      date: asDate(subDays(now, 1)),
      appliesToMonth: asDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      receiptUrl: null,
      voidedAt: null,
      voidReason: null,
      notes: "Asociado al expediente laboral.",
      createdAt: makeTimestamp(subDays(now, 1)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  const recurringExpenses: Array<
    DemoRowBase & {
      description: string;
      amount: string;
      type: "OPERATIVE" | "TAX" | "SERVICE" | "OTHER";
      category: string | null;
      frequency: "monthly" | "quarterly" | "yearly";
      startDate: string;
      endDate: string | null;
      active: boolean;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: makeId(),
      userId,
      description: "Alquiler estudio",
      amount: "185000.00",
      type: "SERVICE",
      category: "Oficina",
      frequency: "monthly",
      startDate: asDate(subMonths(now, 6)),
      endDate: null,
      active: true,
      notes: "Gasto fijo principal.",
      createdAt: makeTimestamp(subMonths(now, 6)),
      updatedAt: makeTimestamp(subDays(now, 6)),
    },
    {
      id: makeId(),
      userId,
      description: "Certificado digital",
      amount: "72000.00",
      type: "SERVICE",
      category: "Herramientas",
      frequency: "yearly",
      startDate: asDate(subMonths(now, 10)),
      endDate: null,
      active: true,
      notes: "Renovacion anual.",
      createdAt: makeTimestamp(subMonths(now, 10)),
      updatedAt: makeTimestamp(subMonths(now, 1)),
    },
  ];

  const reminders: Array<
    DemoRowBase & {
      caseId: string | null;
      clientId: string | null;
      title: string;
      description: string | null;
      reminderDate: Date;
      priority: "LOW" | "MEDIUM" | "HIGH";
      completed: boolean;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }
  > = [
    {
      id: makeId(),
      userId,
      caseId: caseCollectionsId,
      clientId: clientBrunoId,
      title: "Llamar por saldo vencido",
      description: "Confirmar fecha del siguiente pago parcial del ejecutivo.",
      reminderDate: makeTimestamp(addDays(now, 1)),
      priority: "HIGH",
      completed: false,
      completedAt: null,
      createdAt: makeTimestamp(subDays(now, 2)),
      updatedAt: makeTimestamp(subDays(now, 2)),
    },
    {
      id: makeId(),
      userId,
      caseId: caseLaborId,
      clientId: clientClaraId,
      title: "Preparar audiencia",
      description: "Revisar documental y mandar recordatorio previo.",
      reminderDate: makeTimestamp(addDays(now, 3)),
      priority: "HIGH",
      completed: false,
      completedAt: null,
      createdAt: makeTimestamp(subDays(now, 1)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
    {
      id: makeId(),
      userId,
      caseId: null,
      clientId: clientAnaId,
      title: "Enviar resumen de pagos",
      description: "Compartir estado del expediente sucesorio.",
      reminderDate: makeTimestamp(addDays(now, 5)),
      priority: "MEDIUM",
      completed: false,
      completedAt: null,
      createdAt: makeTimestamp(subDays(now, 1)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
    {
      id: makeId(),
      userId,
      caseId: null,
      clientId: null,
      title: "Controlar gastos del mes",
      description: "Revisar desvio entre proyectado y real antes de cerrar la semana.",
      reminderDate: makeTimestamp(addDays(now, 2)),
      priority: "LOW",
      completed: false,
      completedAt: null,
      createdAt: makeTimestamp(subDays(now, 1)),
      updatedAt: makeTimestamp(subDays(now, 1)),
    },
  ];

  return {
    clients,
    cases,
    charges,
    payments,
    expenses,
    recurringExpenses,
    reminders,
  };
}
