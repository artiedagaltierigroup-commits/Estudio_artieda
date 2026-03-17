"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ClientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  taxId: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getClients() {
  const userId = await getUserId();
  return db.query.clients.findMany({
    where: (c, { eq }) => eq(c.userId, userId),
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function getClient(id: string) {
  const userId = await getUserId();
  return db.query.clients.findFirst({
    where: (c, { eq, and }) => and(eq(c.id, id), eq(c.userId, userId)),
    with: { cases: { orderBy: (cs, { desc }) => [desc(cs.createdAt)] } },
  });
}

export async function createClient_action(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.insert(clients).values({ ...parsed.data, userId });
  revalidatePath("/clientes");
  return { success: true };
}

export async function updateClient(id: string, formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db
    .update(clients)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId)));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true };
}

export async function deleteClient(id: string) {
  const userId = await getUserId();
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
  revalidatePath("/clientes");
  return { success: true };
}
