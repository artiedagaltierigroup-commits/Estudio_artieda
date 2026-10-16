import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const state = vi.hoisted(() => ({ db: null as any, owner: "53b4ca96-2ab6-47d2-aa68-80916dc88419", authenticated: true }));
vi.mock("@/db", () => ({ get db() { return state.db; } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.authenticated ? { id: state.owner } : null } }) } }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const databaseUrl = process.env.RECURRING_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
suite("recurrentes: transacciones reales en PostgreSQL aislado", () => {
  let sql: postgres.Sql;
  let actions: typeof import("./recurring-expense-occurrences");
  let expenseActions: typeof import("./expenses");
  let sync: (referenceDate?: Date) => Promise<void>;
  const now = new Date("2026-10-15T15:00:00Z");
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/artieda_recurring_test")) throw new Error("Se requiere la base local aislada de recurrentes");
    sql = postgres(databaseUrl!, { max: 12, prepare: false });
    state.db = drizzle(sql, { schema });
    actions = await import("./recurring-expense-occurrences");
    expenseActions = await import("./expenses");
    sync = (await import("@/lib/recurring-expense-sync")).syncAllRecurringExpenseOccurrences;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  });
  beforeEach(async () => {
    state.authenticated = true;
    await sql`drop trigger if exists delay_expense_test on expenses`;
    await sql`drop trigger if exists reject_occurrence_test on recurring_expense_occurrences`;
    await sql`drop trigger if exists reject_activity_test on activity_log`;
    await sql`delete from recurring_expense_occurrences where user_id = ${state.owner}`;
    await sql`delete from expenses where user_id = ${state.owner}`;
    await sql`delete from recurring_expenses where user_id = ${state.owner}`;
    await sql`delete from activity_log where user_id = ${state.owner}`;
  });
  afterAll(async () => {
    vi.useRealTimers();
    if (sql) {
      await sql`drop trigger if exists delay_expense_test on expenses`;
      await sql`drop trigger if exists reject_occurrence_test on recurring_expense_occurrences`;
      await sql`drop trigger if exists reject_activity_test on activity_log`;
      await sql`drop function if exists reject_recurring_test()`;
      await sql`drop function if exists delay_recurring_test()`;
      await sql.end();
    }
  });
  async function recurring(mode: "AUTOMATIC" | "PAYABLE" = "AUTOMATIC") {
    const [row] = await state.db.insert(schema.recurringExpenses).values({ userId: state.owner, description: "Fixture recurrente", amount: "100.00", startDate: "2026-10-15", endDate: "2026-10-15", mode, payableDayOfMonth: mode === "PAYABLE" ? 15 : null }).returning();
    return row;
  }
  async function occurrence() {
    return (await state.db.select().from(schema.recurringExpenseOccurrences))[0];
  }
  async function failOn(table: "activity_log" | "recurring_expense_occurrences") {
    await sql`create or replace function reject_recurring_test() returns trigger language plpgsql as 'begin raise exception ''fixture failure''; end;'`;
    if (table === "activity_log") await sql`create trigger reject_activity_test before insert on activity_log for each row execute function reject_recurring_test()`;
    else await sql`create trigger reject_occurrence_test before insert or update on recurring_expense_occurrences for each row execute function reject_recurring_test()`;
  }
  it("12 sincronizaciones simultáneas generan un solo gasto y una ocurrencia", async () => {
    await recurring();
    await sql`create or replace function delay_recurring_test() returns trigger language plpgsql as 'begin perform pg_sleep(0.15); return new; end;'`;
    await sql`create trigger delay_expense_test before insert on expenses for each row execute function delay_recurring_test()`;
    await Promise.all(Array.from({ length: 12 }, () => sql`select pg_sleep(0.02)`));
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => sync(now)));
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(0);
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
    expect(await state.db.select().from(schema.recurringExpenseOccurrences)).toHaveLength(1);
  });
  it("un fallo al vincular la ocurrencia revierte también el gasto", async () => {
    await recurring();
    await failOn("recurring_expense_occurrences");
    await expect(sync(now)).rejects.toThrow();
    expect(await state.db.select().from(schema.expenses)).toHaveLength(0);
  });
  it("un fallo del historial revierte gasto y ocurrencia", async () => {
    await recurring();
    await failOn("activity_log");
    await expect(sync(now)).rejects.toThrow();
    expect(await state.db.select().from(schema.expenses)).toHaveLength(0);
    expect(await state.db.select().from(schema.recurringExpenseOccurrences)).toHaveLength(0);
  });
  it("anular un automático conserva la historia y no lo regenera", async () => {
    await recurring(); await sync(now);
    const before = await occurrence();
    await expenseActions.voidExpense(before.expenseId!, "Anulación explícita");
    await sync(now);
    expect((await occurrence()).status).toBe("CANCELLED");
    expect((await occurrence()).expenseId).toBe(before.expenseId);
    const rows = await state.db.select().from(schema.expenses);
    expect(rows).toHaveLength(1); expect(rows[0].voidedAt).not.toBeNull();
  });
  it("no borra definitivamente la historia de un gasto recurrente", async () => {
    await recurring(); await sync(now);
    const before = await occurrence();
    expect(await expenseActions.deleteExpense(before.expenseId!)).toHaveProperty("error");
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
  });
  it("anular payable actualiza estado, pago y gasto en una transacción", async () => {
    await recurring("PAYABLE"); await sync(now);
    await actions.markRecurringOccurrencePaid((await occurrence()).id);
    const paid = await occurrence();
    await expenseActions.voidExpense(paid.expenseId!, "Anulación explícita");
    const cancelled = await occurrence();
    expect(cancelled.status).toBe("CANCELLED"); expect(cancelled.paidAt).toBeNull();
    await actions.reopenRecurringOccurrence(cancelled.id);
    expect((await occurrence()).status).toBe("PENDING");
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
  });
  it("un fallo de historial al reabrir deja el pago y el gasto intactos", async () => {
    await recurring("PAYABLE"); await sync(now);
    await actions.markRecurringOccurrencePaid((await occurrence()).id);
    await failOn("activity_log");
    await expect(actions.reopenRecurringOccurrence((await occurrence()).id)).rejects.toThrow();
    expect((await occurrence()).status).toBe("PAID");
    expect((await state.db.select().from(schema.expenses))[0].voidedAt).toBeNull();
  });
  it("dos pagos manuales simultáneos crean un solo gasto", async () => {
    await recurring("PAYABLE"); await sync(now);
    const id = (await occurrence()).id;
    const results = await Promise.all([actions.markRecurringOccurrencePaid(id), actions.markRecurringOccurrencePaid(id)]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
  });
  async function convertGeneratedToPayable() {
    const row = await recurring();
    await sql`update recurring_expenses set created_at = '2026-10-01T12:00:00Z' where id = ${row.id}`;
    await sync(now);
    const generated = await occurrence();
    const data = new FormData();
    for (const [key, value] of Object.entries({ description: "Convertido a por pagar", amount: "100", mode: "PAYABLE", payableDayOfMonth: "15", active: "true", frequency: "monthly" })) data.set(key, value);
    const { updateRecurringExpense } = await import("./recurring-expenses");
    expect(await updateRecurringExpense(row.id, data)).toHaveProperty("success", true);
    return generated;
  }
  it("cambiar un automático realizado a por pagar conserva su gasto y estado", async () => {
    const generated = await convertGeneratedToPayable();
    await sync(now);
    const [after] = await sql`select status, expense_id from recurring_expense_occurrences where id = ${generated.id}`;
    expect(after.status).toBe("GENERATED"); expect(after.expense_id).toBe(generated.expenseId);
    expect(await actions.markRecurringOccurrencePaid(generated.id)).toHaveProperty("error");
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
  });
  it("sincronización y pagos concurrentes no duplican un período realizado tras cambiar de modo", async () => {
    const generated = await convertGeneratedToPayable();
    const results = await Promise.allSettled([
      sync(now), actions.markRecurringOccurrencePaid(generated.id), sync(now), actions.markRecurringOccurrencePaid(generated.id),
    ]);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(0);
    expect(await state.db.select().from(schema.expenses)).toHaveLength(1);
    const [after] = await sql`select status, expense_id from recurring_expense_occurrences where id = ${generated.id}`;
    expect(after.status).toBe("GENERATED"); expect(after.expense_id).toBe(generated.expenseId);
  });
  it("el calendario corregido no duplica períodos históricos que derivaron del día 31 al 28", async () => {
    const [row] = await state.db.insert(schema.recurringExpenses).values({ userId: state.owner, description: "Fixture día 31", amount: "100", startDate: "2026-01-31", endDate: "2026-03-31", mode: "AUTOMATIC" }).returning();
    for (const date of ["2026-01-31", "2026-02-28", "2026-03-28"]) {
      const [expense] = await state.db.insert(schema.expenses).values({ userId: state.owner, recurringExpenseId: row.id, description: "Historia conservada", amount: "100", date, origin: "RECURRING_AUTOMATIC" }).returning();
      await state.db.insert(schema.recurringExpenseOccurrences).values({ userId: state.owner, recurringExpenseId: row.id, dueDate: date, expenseId: expense.id, status: "GENERATED" });
    }
    await sync(now);
    expect(await state.db.select().from(schema.expenses)).toHaveLength(3);
    expect((await state.db.select().from(schema.recurringExpenseOccurrences)).map((item: any) => item.dueDate)).toContain("2026-03-28");
  });
  it("la proyección pendiente excluye realizados y anulados", async () => {
    await recurring(); await sync(now);
    await state.db.insert(schema.recurringExpenses).values({ userId: state.owner, description: "Todavía futuro", amount: "70", startDate: "2026-10-20", mode: "AUTOMATIC" });
    const [cancelled] = await state.db.insert(schema.recurringExpenses).values({ userId: state.owner, description: "Anulado", amount: "50", startDate: "2026-10-25", mode: "AUTOMATIC" }).returning();
    await state.db.insert(schema.recurringExpenseOccurrences).values({ userId: state.owner, recurringExpenseId: cancelled.id, dueDate: "2026-10-25", status: "CANCELLED" });
    const { getPendingRecurringProjection } = await import("./recurring-expenses");
    expect(await getPendingRecurringProjection("2026-10-01", "2026-10-31")).toBe(70);
  });
  it("la acción pública exige sesión y no exporta el trabajo global", async () => {
    expect("syncAllRecurringExpenseOccurrences" in actions).toBe(false);
    state.authenticated = false;
    await expect(actions.syncRecurringExpenseOccurrences()).rejects.toThrow("No autenticado");
    expect(await state.db.select().from(schema.expenses)).toHaveLength(0);
  });
  it("un argumento manipulado no adelanta el horizonte de generación de la acción pública", async () => {
    await state.db.insert(schema.recurringExpenses).values({ userId: state.owner, description: "Un año futuro", amount: "100", startDate: "2027-10-15", endDate: "2027-10-15", mode: "AUTOMATIC" });
    await (actions.syncRecurringExpenseOccurrences as any)(new Date("2028-10-15T12:00:00Z"));
    expect(await state.db.select().from(schema.expenses)).toHaveLength(0);
  });
  it("un fallo al anular la ocurrencia revierte la anulación del gasto", async () => {
    await recurring(); await sync(now);
    const paid = await occurrence();
    await failOn("recurring_expense_occurrences");
    await expect(expenseActions.voidExpense(paid.expenseId!, "Fixture")).rejects.toThrow();
    expect((await occurrence()).status).toBe("GENERATED");
    expect((await state.db.select().from(schema.expenses))[0].voidedAt).toBeNull();
  });
  it("no elimina la programación que tiene historia financiera", async () => {
    const row = await recurring(); await sync(now);
    const { deleteRecurringExpense } = await import("./recurring-expenses");
    expect(await deleteRecurringExpense(row.id)).toHaveProperty("error");
    expect(await state.db.select().from(schema.recurringExpenseOccurrences)).toHaveLength(1);
  });
  it.each(["NaN", "Infinity", "0", "-1", "1.001", "10000000000"])("rechaza importe inválido %s en gastos y recurrentes", async (amount) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ description: "Fixture inválido", amount, date: "2026-10-15", startDate: "2026-10-15", mode: "AUTOMATIC", active: "true" })) data.set(key, value);
    const { createRecurringExpense } = await import("./recurring-expenses");
    expect(await expenseActions.createExpense(data)).toHaveProperty("error");
    expect(await createRecurringExpense(data)).toHaveProperty("error");
    expect(await state.db.select().from(schema.expenses)).toHaveLength(0);
    expect(await state.db.select().from(schema.recurringExpenses)).toHaveLength(0);
  });
});
