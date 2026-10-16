"use server";

import { db } from "../db";
import { requireAdminAccess } from "@/lib/workspace-access";

async function getUserId(): Promise<string> {
  return (await requireAdminAccess()).ownerUserId;
}

export async function getActivityLog() {
  const userId = await getUserId();

  return db.query.activityLog.findMany({
    where: (log, { eq }) => eq(log.userId, userId),
    orderBy: (log, { desc }) => [desc(log.createdAt)],
    limit: 200,
  });
}
