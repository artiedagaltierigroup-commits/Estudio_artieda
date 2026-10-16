import "server-only";
import { db } from "@/db";
import { activityLog } from "@/db/schema";

type ActivityValues = typeof activityLog.$inferInsert;
export type LogParams = Pick<ActivityValues, "userId" | "entityType" | "entityId" | "action"> & {
  actorUserId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  note?: string;
};

// Internal helper: identity comes from the caller's verified operation, never a public action argument.
export async function logActivity(params: LogParams, executor: Pick<typeof db, "insert"> = db) {
  await executor.insert(activityLog).values({
    ...params,
    previousValue: params.previousValue ?? null,
    newValue: params.newValue ?? null,
    note: params.note ?? null,
  });
}
