"use server";

import { db } from "../db";
import { activityLog } from "../db/schema";
import { createClient } from "../lib/supabase/server";

interface LogParams {
  userId: string;
  entityType:
    | "case"
    | "charge"
    | "document"
    | "payment"
    | "expense"
    | "reminder"
    | "savings_goal"
    | "savings_contribution"
    | "signature_request";
  entityId: string;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "status_changed"
    | "due_date_changed"
    | "sent"
    | "signed"
    | "resent"
    | "cancelled"
    | "downloaded";
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  note?: string;
}

export async function logActivity(params: LogParams) {
  await db.insert(activityLog).values({
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    previousValue: params.previousValue ?? null,
    newValue: params.newValue ?? null,
    note: params.note ?? null,
  });
}

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
