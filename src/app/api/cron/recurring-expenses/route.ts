import { syncAllRecurringExpenseOccurrences } from "@/lib/recurring-expense-sync";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  await syncAllRecurringExpenseOccurrences(new Date());

  return Response.json({
    ok: true,
    syncedAt: new Date().toISOString(),
  });
}
