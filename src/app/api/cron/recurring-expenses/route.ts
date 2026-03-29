import { syncAllRecurringExpenseOccurrences } from "@/actions/recurring-expense-occurrences";

export async function GET() {
  await syncAllRecurringExpenseOccurrences(new Date());

  return Response.json({
    ok: true,
    syncedAt: new Date().toISOString(),
  });
}
