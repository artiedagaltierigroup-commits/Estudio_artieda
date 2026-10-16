"use server";

import { db } from "../db";
import { createClient } from "../lib/supabase/server";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");
  return user.id;
}

export async function getActivityLog() {
  const userId = await getUserId();

  return db.query.activityLog.findMany({
    where: (log, { eq }) => eq(log.userId, userId),
    orderBy: (log, { desc }) => [desc(log.createdAt)],
    limit: 200,
  });
}
