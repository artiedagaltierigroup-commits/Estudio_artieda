vi.mock("@/lib/workspace-access", () => ({ requireAdminAccess: async () => ({actorUserId:state.userId,ownerUserId:state.userId,role:"ADMIN"}) }));
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

// This suite never loads .env files and cannot connect to a production database.
const testUrl = process.env.PAYMENTS_TEST_DATABASE_URL;
const state = vi.hoisted(() => ({ userId: "", database: null as unknown }));
vi.mock("@/db", () => ({ get db() { return state.database; } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: state.userId } } }) } }),
}));
// Preserve the old writer's real behavior while exercising the pre-fix action, too.
vi.mock("@/actions/activity-log", async () => await import("@/lib/activity-log"));

describe.skipIf(!testUrl)("cobros y pagos con PostgreSQL aislado", () => {
  let sql: ReturnType<typeof postgres>;
  let actions: typeof import("./payments");
  let chargeActions: typeof import("./charges");
  let clientId: string;
  let caseId: string;
  let chargeId: string;
  let otherUserId: string;
  let otherCaseId: string;
  let releaseChargeWrite: (() => Promise<void>) | undefined;
  const form = (values: Record<string, string>) => {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
  };
  const payment = (amount = "100", paymentId = randomUUID(), overrides: Record<string, string> = {}) =>
    actions.createPayment(form({ chargeId, amount, paymentId, paymentDate: "2026-10-15", ...overrides }));
  const chargeForm = (overrides: Record<string, string> = {}) =>
    form({ chargeId: randomUUID(), caseId, description: "Cobro sintético", amountTotal: "100", ...overrides });
  const rows = () => sql`select amount from payments where charge_id = ${chargeId}`;
  const delayChargeWrite = async () => {
    let release!: () => void;
    let ready!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    const acquired = new Promise<void>((resolve) => { ready = resolve; });
    const holder = sql.begin(async (tx) => {
      await tx.unsafe("select pg_advisory_xact_lock(881450011)");
      ready();
      await released;
    });
    releaseChargeWrite = async () => { release(); await holder; };
    await acquired;
    await sql`create or replace function payments_test_charge_delay() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock(881450011); if TG_OP = 'DELETE' then return OLD; end if; return NEW; end $$`;
    await sql`create trigger payments_test_charge_delay before update or delete on charges for each row execute function payments_test_charge_delay()`;
  };
  const waitForChargeWrite = async () => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const active = await sql`select pid from pg_stat_activity where datname = current_database() and wait_event = 'advisory'`;
      if (active.length) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("No comenzó la escritura de prueba");
  };
  const waitForPaymentDecision = async (attempt: Promise<unknown>) => {
    let finished = false;
    void attempt.then(() => { finished = true; }, () => { finished = true; });
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const active = await sql`select pid from pg_stat_activity where datname = current_database() and wait_event in ('transactionid', 'tuple')`;
      if (finished || active.length) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("El pago no llegó a ejecutarse durante la escritura");
  };

  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/artieda_payments_test") {
      throw new Error("Las pruebas sólo admiten artieda_payments_test en loopback");
    }
    sql = postgres(testUrl!, { max: 6, prepare: false, onnotice: () => {} });
    state.database = drizzle(sql, { schema });
    actions = await import("./payments");
    chargeActions = await import("./charges");
  });
  beforeEach(async () => {
    state.userId = randomUUID();
    otherUserId = randomUUID();
    [{ id: clientId }] = await sql`insert into clients(user_id, name) values (${state.userId}, 'Sintético') returning id`;
    [{ id: caseId }] = await sql`insert into cases(user_id, client_id, title) values (${state.userId}, ${clientId}, 'Caso sintético') returning id`;
    [{ id: otherCaseId }] = await sql`insert into cases(user_id, client_id, title) values (${otherUserId}, ${clientId}, 'Ajeno sintético') returning id`;
    [{ id: chargeId }] = await sql`insert into charges(user_id, case_id, description, amount_total) values (${state.userId}, ${caseId}, 'Cobro sintético', 100) returning id`;
  });
  afterEach(async () => {
    await releaseChargeWrite?.();
    releaseChargeWrite = undefined;
    await sql`drop trigger if exists payments_test_delay on payments`;
    await sql`drop trigger if exists payments_test_failure on payments`;
    await sql`drop trigger if exists payments_test_audit_failure on activity_log`;
    await sql`drop trigger if exists payments_test_charge_delay on charges`;
    await sql`delete from activity_log where user_id in (${state.userId}, ${otherUserId})`;
    await sql`delete from clients where id = ${clientId}`;
  });
  afterAll(async () => { await sql?.end(); });

  it("sólo acepta uno de dos pagos simultáneos por todo el saldo", async () => {
    await sql`create or replace function payments_test_delay() returns trigger language plpgsql as $$ begin perform pg_sleep(0.15); return NEW; end $$`;
    await sql`create trigger payments_test_delay before insert on payments for each row execute function payments_test_delay()`;
    const results = await Promise.all([payment(), payment()]);
    expect(results.filter((result) => "success" in result)).toHaveLength(1);
    expect(await rows()).toHaveLength(1);
  });

  it("acepta los últimos veinte centavos de un cobro de treinta", async () => {
    await sql`update charges set amount_total = 0.30 where id = ${chargeId}`;
    await sql`insert into payments(user_id, charge_id, amount, payment_date) values (${state.userId}, ${chargeId}, 0.10, '2026-10-15')`;
    expect(await payment("0.20")).toEqual({ success: true });
  });

  it.each(["NaN", "Infinity", "-Infinity", "0", "-1", "0.001", "1e2", "10000000000", "10000000000.00", " "])(
    "rechaza el importe inválido %s sin modificar pagos", async (amount) => {
      await expect(payment(amount)).resolves.toHaveProperty("error");
      expect(await rows()).toHaveLength(0);
    },
  );

  it("reintentar un mismo pago no lo duplica y conserva una sola auditoría", async () => {
    const id = randomUUID();
    expect(await payment("20", id)).toEqual({ success: true });
    expect(await payment("20.00", id)).toEqual({ success: true });
    expect(await rows()).toHaveLength(1);
    const logs = await sql`select id from activity_log where user_id = ${state.userId} and entity_type = 'payment'`;
    expect(logs).toHaveLength(1);
  });

  it("rechaza reutilizar la identificación del pago con otro importe", async () => {
    const id = randomUUID();
    await payment("20", id);
    expect(await payment("21", id)).toHaveProperty("error");
    expect(await rows()).toHaveLength(1);
  });

  it("no permite falsificar una identificación de pago de otro usuario", async () => {
    const [{ id }] = await sql`insert into payments(user_id, charge_id, amount, payment_date) values (${otherUserId}, ${chargeId}, 20, '2026-10-15') returning id`;
    expect(await payment("20", id)).toHaveProperty("error");
    expect(await rows()).toHaveLength(1);
  });

  it("no permite bajar el total por debajo de los pagos existentes", async () => {
    await payment("80");
    expect(await chargeActions.updateCharge(chargeId, chargeForm({ amountTotal: "79.99" }))).toHaveProperty("error");
    expect((await sql`select amount_total from charges where id = ${chargeId}`)[0].amount_total).toBe("100.00");
  });

  it("rechaza crear y trasladar cobros a un caso ajeno", async () => {
    expect(await chargeActions.createCharge(chargeForm({ caseId: otherCaseId }))).toHaveProperty("error");
    expect(await chargeActions.updateCharge(chargeId, chargeForm({ caseId: otherCaseId }))).toHaveProperty("error");
    expect((await sql`select case_id from charges where id = ${chargeId}`)[0].case_id).toBe(caseId);
  });

  it("revierte también el cobro si falla su pago inicial", async () => {
    await sql`create or replace function payments_test_failure() returns trigger language plpgsql as $$ begin raise exception 'Fallo sintético del pago'; end $$`;
    await sql`create trigger payments_test_failure before insert on payments for each row execute function payments_test_failure()`;
    await expect(chargeActions.createCharge(chargeForm({ markAsPaid: "on" }))).rejects.toThrow();
    expect(await sql`select id from charges where user_id = ${state.userId}`).toHaveLength(1);
  });

  it("revierte el pago si no se puede guardar su auditoría", async () => {
    await sql`create or replace function payments_test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'Fallo sintético de auditoría'; end $$`;
    await sql`create trigger payments_test_audit_failure before insert on activity_log for each row execute function payments_test_audit_failure()`;
    await expect(payment("20")).rejects.toThrow();
    expect(await rows()).toHaveLength(0);
  });

  it("no cobra registros ajenos o cancelados", async () => {
    await sql`update charges set user_id = ${otherUserId} where id = ${chargeId}`;
    expect(await payment()).toHaveProperty("error");
    await sql`update charges set user_id = ${state.userId}, cancelled_at = now() where id = ${chargeId}`;
    expect(await payment()).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it("dos reintentos simultáneos del mismo pago se confirman una sola vez", async () => {
    const id = randomUUID();
    expect(await Promise.all([payment("100", id), payment("100", id)])).toEqual([{ success: true }, { success: true }]);
    expect(await rows()).toHaveLength(1);
  });

  it("espera una reducción de total en curso antes de comprobar el saldo", async () => {
    await delayChargeWrite();
    const edit = chargeActions.updateCharge(chargeId, chargeForm({ amountTotal: "50" }));
    await waitForChargeWrite();
    const pay = payment("80");
    await waitForPaymentDecision(pay);
    await releaseChargeWrite!();
    expect(await edit).toEqual({ success: true });
    expect(await pay).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it("espera la cancelación en curso y no registra el pago después", async () => {
    await delayChargeWrite();
    const cancel = chargeActions.cancelCharge(chargeId, "Prueba");
    await waitForChargeWrite();
    const pay = payment("20");
    await waitForPaymentDecision(pay);
    await releaseChargeWrite!();
    expect(await cancel).toEqual({ success: true });
    expect(await pay).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it("un pago durante el borrado del cobro devuelve error sin dejar registros", async () => {
    await delayChargeWrite();
    const remove = chargeActions.deleteCharge(chargeId);
    await waitForChargeWrite();
    const pay = payment("20");
    await waitForPaymentDecision(pay);
    await releaseChargeWrite!();
    expect(await remove).toEqual({ success: true });
    expect(await pay).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it("revierte el borrado de pago y de cobro si falla auditoría", async () => {
    const paymentId = randomUUID();
    await payment("20", paymentId);
    await sql`create or replace function payments_test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'Fallo sintético de auditoría'; end $$`;
    await sql`create trigger payments_test_audit_failure before insert on activity_log for each row execute function payments_test_audit_failure()`;
    await expect(actions.deletePayment(paymentId)).rejects.toThrow();
    await expect(chargeActions.deleteCharge(chargeId)).rejects.toThrow();
    expect(await rows()).toHaveLength(1);
    expect(await sql`select id from charges where id = ${chargeId}`).toHaveLength(1);
  });

  it("las lecturas no devuelven casos ni clientes de otro propietario", async () => {
    expect(await chargeActions.getCharge(chargeId)).toHaveProperty("id", chargeId);
    await sql`update charges set case_id = ${otherCaseId} where id = ${chargeId}`;
    expect(await chargeActions.getCharge(chargeId)).toBeNull();
    expect(await chargeActions.getCharges()).toEqual([]);
    await sql`update charges set case_id = ${caseId} where id = ${chargeId}`;
    await sql`update clients set user_id = ${otherUserId} where id = ${clientId}`;
    expect(await chargeActions.getCharge(chargeId)).toBeNull();
  });

  it("el alta pagada guarda cobro, pago y las dos auditorías juntos", async () => {
    const result = await chargeActions.createCharge(chargeForm({ markAsPaid: "on", amountTotal: "90.25" }));
    expect(result).toHaveProperty("success", true);
    if (!("chargeId" in result)) throw new Error("No se creó el cobro");
    const saved = await sql`select amount from payments where charge_id = ${result.chargeId!}`;
    expect(saved).toEqual([{ amount: "90.25" }]);
    expect(await sql`select id from activity_log where user_id = ${state.userId}`).toHaveLength(2);
  });

  it.each(["NaN", "Infinity", "0", "-1", "0.001", "1e2", "10000000000"])("rechaza total inválido %s al crear y editar", async (amountTotal) => {
    expect(await chargeActions.createCharge(chargeForm({ amountTotal }))).toHaveProperty("error");
    expect(await chargeActions.updateCharge(chargeId, chargeForm({ amountTotal }))).toHaveProperty("error");
    expect(await sql`select id from charges where user_id = ${state.userId}`).toHaveLength(1);
  });

  it.each(["2026-02-30", "15/10/2026", "2026-13-01"])("rechaza fecha inválida %s antes de escribir", async (paymentDate) => {
    expect(await payment("20", randomUUID(), { paymentDate })).toHaveProperty("error");
    expect(await chargeActions.updateDueDate(chargeId, paymentDate)).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it("un reintento atrasado no recrea un pago eliminado", async () => {
    const id = randomUUID();
    await payment("20", id);
    expect(await actions.deletePayment(id)).toEqual({ success: true });
    expect(await payment("20", id)).toHaveProperty("error");
    expect(await rows()).toHaveLength(0);
  });

  it.each(["false", "on"])("dos altas simultáneas con el mismo intento crean un solo cobro (pagado=%s)", async (markAsPaid) => {
    const id = randomUUID();
    const payload = { chargeId: id, amountTotal: "90.25", markAsPaid };
    const results = await Promise.all([
      chargeActions.createCharge(chargeForm(payload)), chargeActions.createCharge(chargeForm(payload)),
    ]);
    expect(results).toEqual([
      { success: true, chargeId: id, caseId }, { success: true, chargeId: id, caseId },
    ]);
    expect(await sql`select id from charges where user_id = ${state.userId}`).toHaveLength(2);
    expect(await sql`select id from payments where charge_id = ${id}`).toHaveLength(markAsPaid === "on" ? 1 : 0);
    expect(await sql`select id from activity_log where user_id = ${state.userId}`).toHaveLength(markAsPaid === "on" ? 2 : 1);
  });

  it("un alta reintentada compara contenido normalizado y no paga otra vez", async () => {
    const id = randomUUID();
    expect(await chargeActions.createCharge(chargeForm({ chargeId: id, amountTotal: "90.2", notes: "  Nota  ", markAsPaid: "on" }))).toHaveProperty("success", true);
    expect(await chargeActions.createCharge(chargeForm({ chargeId: id, amountTotal: "90.20", notes: "Nota", markAsPaid: "true" }))).toHaveProperty("chargeId", id);
    expect(await sql`select id from payments where charge_id = ${id}`).toHaveLength(1);
  });

  it("rechaza cambiar el contenido o el pago inicial al reutilizar un alta", async () => {
    const id = randomUUID();
    await chargeActions.createCharge(chargeForm({ chargeId: id }));
    const changes: Array<Record<string, string>> = [
      { amountTotal: "99" }, { description: "Otra descripción" }, { dueDate: "2026-11-01" }, { markAsPaid: "on" },
    ];
    for (const changed of changes) {
      expect(await chargeActions.createCharge(chargeForm({ chargeId: id, ...changed }))).toHaveProperty("error");
    }
    expect(await sql`select amount_total from charges where id = ${id}`).toEqual([{ amount_total: "100.00" }]);
    expect(await sql`select id from payments where charge_id = ${id}`).toHaveLength(0);
  });

  it("no permite reutilizar el identificador de un cobro ajeno", async () => {
    await sql`update charges set user_id = ${otherUserId} where id = ${chargeId}`;
    expect(await chargeActions.createCharge(chargeForm({ chargeId }))).toHaveProperty("error");
    expect(await sql`select id from charges where case_id = ${caseId}`).toHaveLength(1);
  });

  it("un reintento de alta no recrea el cobro ni su pago después del borrado", async () => {
    const id = randomUUID();
    const payload = { chargeId: id, markAsPaid: "on" };
    await chargeActions.createCharge(chargeForm(payload));
    expect(await chargeActions.deleteCharge(id)).toEqual({ success: true });
    expect(await chargeActions.createCharge(chargeForm(payload))).toHaveProperty("error");
    expect(await sql`select id from charges where id = ${id}`).toHaveLength(0);
    expect(await sql`select id from payments where charge_id = ${id}`).toHaveLength(0);
  });

  it("un reintento del alta original no revierte cambios posteriores", async () => {
    const id = randomUUID();
    await chargeActions.createCharge(chargeForm({ chargeId: id }));
    expect(await chargeActions.updateCharge(id, chargeForm({ amountTotal: "125", description: "Descripción editada" }))).toHaveProperty("success", true);
    expect(await chargeActions.createCharge(chargeForm({ chargeId: id }))).toHaveProperty("chargeId", id);
    expect(await sql`select amount_total, description from charges where id = ${id}`)
      .toEqual([{ amount_total: "125.00", description: "Descripción editada" }]);
  });
});
