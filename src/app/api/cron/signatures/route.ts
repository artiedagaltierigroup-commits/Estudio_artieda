import { db } from "@/db";
import { signatureEvents, signatureRequests } from "@/db/schema";
import { EXPIRABLE_SIGNATURE_STATUSES } from "@/lib/signature-expiration";
import { and, eq, inArray, lt } from "drizzle-orm";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const expiredRequests = await db.query.signatureRequests.findMany({
    where: (item) =>
      and(
        inArray(item.status, EXPIRABLE_SIGNATURE_STATUSES),
        lt(item.tokenExpiresAt, now)
      ),
  });

  for (const signatureRequest of expiredRequests) {
    await db
      .update(signatureRequests)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(signatureRequests.id, signatureRequest.id));

    await db.insert(signatureEvents).values({
      userId: signatureRequest.userId,
      signatureRequestId: signatureRequest.id,
      type: "expired",
      metadata: { tokenExpiresAt: signatureRequest.tokenExpiresAt },
    });
  }

  return Response.json({
    ok: true,
    expired: expiredRequests.length,
    syncedAt: now.toISOString(),
  });
}
