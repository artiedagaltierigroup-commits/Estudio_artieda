"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { filterCasesByFilters, getCasePendingBalance, summarizeCaseFinance } from "@/lib/case-insights";
import { createClient } from "@/lib/supabase/server";
import { deriveChargeStatus } from "@/lib/utils";
import { logActivity } from "./activity-log";

const CaseSchema = z
  .object({
    clientId: z.string().trim().min(1, "Selecciona un cliente"),
    title: z.string().trim().min(1, "El titulo es obligatorio"),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "CLOSED", "SUSPENDED"]).default("ACTIVE"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    fee: z.string().optional(),
    preferredPaymentMethod: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  });

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toCaseValues(data: z.infer<typeof CaseSchema>, clientId: string) {
  return {
    clientId,
    title: data.title.trim(),
    description: normalizeOptionalText(data.description),
    status: data.status,
    priority: data.priority,
    fee: normalizeOptionalText(data.fee),
    preferredPaymentMethod: normalizeOptionalText(data.preferredPaymentMethod),
    startDate: normalizeOptionalText(data.startDate),
    endDate: normalizeOptionalText(data.endDate),
  };
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getCases(filters?: { query?: string; status?: string; chargeStatus?: string }) {
  const userId = await getUserId();
  const rows = await db.query.cases.findMany({
    where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
    with: {
      client: true,
      charges: {
        with: {
          payments: true,
        },
      },
    },
    orderBy: (item, { desc }) => [desc(item.updatedAt)],
  });

  const enriched = rows.map((currentCase) => {
    const financeSummary = summarizeCaseFinance(currentCase.charges);
    const pendingBalance = getCasePendingBalance(
      currentCase.fee,
      financeSummary.collected,
      financeSummary.balance
    );

    return {
      ...currentCase,
      financeSummary,
      pendingBalance,
      latestDueDate: financeSummary.nextDueDate,
    };
  });

  return filterCasesByFilters(enriched, filters ?? {});
}

export async function getCase(id: string) {
  const userId = await getUserId();
  const currentCase = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      client: true,
      charges: {
        with: {
          payments: {
            orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)],
          },
        },
        orderBy: (charge, { asc }) => [asc(charge.dueDate), asc(charge.createdAt)],
      },
      reminders: {
        orderBy: (reminder, { asc }) => [asc(reminder.reminderDate)],
      },
    },
  });

  if (!currentCase) return null;

  const financeSummary = summarizeCaseFinance(currentCase.charges);
  const paymentTimeline = currentCase.charges
    .flatMap((charge) =>
      charge.payments.map((payment) => ({
        id: payment.id,
        chargeId: charge.id,
        chargeDescription: charge.description,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        method: payment.method,
        notes: payment.notes,
        createdAt: payment.createdAt,
      }))
    )
    .sort((left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime());

  const chargesWithDerivedStatus = currentCase.charges.map((charge) => {
    const amountPaid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const derivedStatus = deriveChargeStatus(
      charge.amountTotal,
      amountPaid.toFixed(2),
      charge.dueDate,
      charge.cancelledAt
    );

    return {
      ...charge,
      amountPaid: amountPaid.toFixed(2),
      balance: Math.max(0, Number(charge.amountTotal) - amountPaid),
      derivedStatus,
    };
  });

  return {
    ...currentCase,
    financeSummary,
    paymentTimeline,
    chargesWithDerivedStatus,
  };
}

export async function getCaseRecord(id: string) {
  const userId = await getUserId();
  return db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
}

export async function createCase(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CaseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db
    .insert(cases)
    .values({ ...toCaseValues(parsed.data, parsed.data.clientId), userId })
    .returning();

  await logActivity({
    userId,
    entityType: "case",
    entityId: inserted.id,
    action: "created",
    newValue: parsed.data,
  });

  revalidatePath("/casos");
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { success: true, caseId: inserted.id, clientId: parsed.data.clientId };
}

export async function updateCase(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CaseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const existing = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Caso no encontrado" };

  await db
    .update(cases)
    .set({ ...toCaseValues(parsed.data, parsed.data.clientId), updatedAt: new Date() })
    .where(and(eq(cases.id, id), eq(cases.userId, userId)));

  await logActivity({
    userId,
    entityType: "case",
    entityId: id,
    action: "updated",
    previousValue: existing as Record<string, unknown>,
    newValue: parsed.data,
  });

  revalidatePath("/casos");
  revalidatePath(`/casos/${id}`);
  revalidatePath(`/casos/${id}/editar`);
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { success: true };
}

export async function updateCaseStatus(id: string, status: "ACTIVE" | "CLOSED" | "SUSPENDED") {
  const userId = await getUserId();
  const existing = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Caso no encontrado" };

  await db
    .update(cases)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(cases.id, id), eq(cases.userId, userId)));

  await logActivity({
    userId,
    entityType: "case",
    entityId: id,
    action: "status_changed",
    previousValue: { status: existing.status },
    newValue: { status },
  });

  revalidatePath("/casos");
  revalidatePath(`/casos/${id}`);
  revalidatePath(`/clientes/${existing.clientId}`);
  return { success: true };
}
