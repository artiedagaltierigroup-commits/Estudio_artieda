"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cases, charges, clients, expenses, payments, recurringExpenses, reminders } from "@/db/schema";
import { buildDemoWorkspaceSeed } from "@/lib/demo-seed";
import { createClient } from "@/lib/supabase/server";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function seedDemoWorkspace() {
  const userId = await getUserId();
  const existingClients = await db.query.clients.findFirst({
    where: (item, { eq: eqOperator }) => eqOperator(item.userId, userId),
    columns: { id: true },
  });

  if (existingClients) {
    return {
      error: "La cuenta ya tiene datos cargados. La carga demo solo se habilita sobre una base vacia.",
    };
  }

  const seed = buildDemoWorkspaceSeed(userId, new Date());

  await db.insert(clients).values(seed.clients);
  await db.insert(cases).values(seed.cases);
  await db.insert(charges).values(seed.charges);
  await db.insert(payments).values(seed.payments);
  await db.insert(expenses).values(seed.expenses);
  await db.insert(recurringExpenses).values(seed.recurringExpenses);
  await db.insert(reminders).values(seed.reminders);

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/casos");
  revalidatePath("/cobros");
  revalidatePath("/gastos");
  revalidatePath("/recordatorios");
  revalidatePath("/calendario");
  revalidatePath("/estadisticas");
  revalidatePath("/configuracion");

  return {
    success: true,
    counts: {
      clients: seed.clients.length,
      cases: seed.cases.length,
      charges: seed.charges.length,
      payments: seed.payments.length,
      expenses: seed.expenses.length,
      recurringExpenses: seed.recurringExpenses.length,
      reminders: seed.reminders.length,
    },
  };
}
