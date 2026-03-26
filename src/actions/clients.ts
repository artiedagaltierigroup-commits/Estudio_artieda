"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema";
import {
  filterClientsByQuery,
  getClientPortfolioStatus,
  summarizeClientFinance,
} from "@/lib/client-insights";
import { normalizeClientMutationInput } from "@/lib/client-mutations";
import { summarizeCaseCharges, summarizeClientCases } from "@/lib/detail-summaries";
import { createClient } from "@/lib/supabase/server";
import { deriveChargeStatus } from "@/lib/utils";

const ClientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  taxId: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  languages: z.string().optional(),
  notes: z.string().optional(),
});

const InlineClientSchema = ClientSchema.pick({
  name: true,
  taxId: true,
  email: true,
  phone: true,
  languages: true,
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getClients(query?: string) {
  const userId = await getUserId();
  const rows = await db.query.clients.findMany({
    where: (client, { eq: eqOperator }) => eqOperator(client.userId, userId),
    orderBy: (client, { asc }) => [asc(client.name)],
    with: {
      cases: {
        orderBy: (currentCase, { desc }) => [desc(currentCase.updatedAt)],
        with: {
          charges: {
            with: {
              payments: true,
            },
          },
        },
      },
      reminders: {
        orderBy: (reminder, { asc }) => [asc(reminder.reminderDate)],
      },
    },
  });

  const enriched = rows.map((client) => {
    const caseSummary = summarizeClientCases(client.cases);
    const financeSummary = summarizeClientFinance({
      clientUpdatedAt: client.updatedAt,
      cases: client.cases,
      reminders: client.reminders,
    });

    return {
      ...client,
      caseSummary,
      financeSummary,
      portfolioStatus: getClientPortfolioStatus({
        activeCases: caseSummary.active,
        overdueCharges: financeSummary.overdue,
        openReminders: financeSummary.openReminders,
      }),
    };
  });

  return filterClientsByQuery(enriched, query);
}

export async function getClient(id: string) {
  const userId = await getUserId();
  const client = await db.query.clients.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
    with: {
      cases: {
        orderBy: (currentCase, { desc }) => [desc(currentCase.updatedAt)],
        with: {
          charges: {
            orderBy: (charge, { asc }) => [asc(charge.dueDate), asc(charge.createdAt)],
            with: {
              payments: {
                orderBy: (payment, { desc }) => [desc(payment.paymentDate), desc(payment.createdAt)],
              },
            },
          },
        },
      },
      reminders: {
        orderBy: (reminder, { asc }) => [asc(reminder.reminderDate)],
      },
    },
  });

  if (!client) return null;

  const caseSummary = summarizeClientCases(client.cases);
  const financeSummary = summarizeClientFinance({
    clientUpdatedAt: client.updatedAt,
    cases: client.cases,
    reminders: client.reminders,
  });

  const casesWithSummary = client.cases.map((currentCase) => ({
    ...currentCase,
    chargeSummary: summarizeCaseCharges(currentCase.charges),
  }));

  const paymentTimeline = client.cases
    .flatMap((currentCase) =>
      currentCase.charges.flatMap((charge) =>
        charge.payments.map((payment) => ({
          id: payment.id,
          caseId: currentCase.id,
          caseTitle: currentCase.title,
          chargeId: charge.id,
          chargeDescription: charge.description,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          method: payment.method,
          notes: payment.notes,
          createdAt: payment.createdAt,
        }))
      )
    )
    .sort((left, right) => {
      const leftDate = new Date(left.paymentDate).getTime();
      const rightDate = new Date(right.paymentDate).getTime();
      return rightDate - leftDate;
    });

  const upcomingCharges = client.cases
    .flatMap((currentCase) =>
      currentCase.charges.map((charge) => {
        const amountPaid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const derivedStatus = deriveChargeStatus(
          charge.amountTotal,
          amountPaid.toFixed(2),
          charge.dueDate,
          charge.cancelledAt
        );

        return {
          id: charge.id,
          caseId: currentCase.id,
          caseTitle: currentCase.title,
          description: charge.description,
          dueDate: charge.dueDate,
          followUpDate: charge.followUpDate,
          amountTotal: charge.amountTotal,
          amountPaid: amountPaid.toFixed(2),
          balance: Math.max(0, Number(charge.amountTotal) - amountPaid),
          derivedStatus,
        };
      })
    )
    .filter((charge) => charge.derivedStatus !== "PAID" && charge.derivedStatus !== "CANCELLED")
    .sort((left, right) => {
      const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    });

  return {
    ...client,
    caseSummary,
    financeSummary,
    portfolioStatus: getClientPortfolioStatus({
      activeCases: caseSummary.active,
      overdueCharges: financeSummary.overdue,
      openReminders: financeSummary.openReminders,
    }),
    casesWithSummary,
    paymentTimeline,
    upcomingCharges,
  };
}

export async function getClientRecord(id: string) {
  const userId = await getUserId();
  return db.query.clients.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
}

export async function createClientAction(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const [inserted] = await db
    .insert(clients)
    .values({ ...normalizeClientMutationInput(parsed.data), userId })
    .returning();
  revalidatePath("/clientes");
  return { success: true, clientId: inserted.id };
}

export async function createClientInlineAction(input: {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  languages?: string;
}) {
  const userId = await getUserId();
  const parsed = InlineClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const [inserted] = await db
    .insert(clients)
    .values({ ...normalizeClientMutationInput(parsed.data), userId })
    .returning({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone, taxId: clients.taxId });

  revalidatePath("/clientes");
  revalidatePath("/casos");

  return {
    success: true,
    client: inserted,
  };
}

export async function updateClient(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db
    .update(clients)
    .set({ ...normalizeClientMutationInput(parsed.data), updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId)));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath(`/clientes/${id}/editar`);
  return { success: true };
}

export async function deleteClient(id: string) {
  const userId = await getUserId();
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
  revalidatePath("/clientes");
  return { success: true };
}
