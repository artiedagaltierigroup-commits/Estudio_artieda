import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import type { Sql } from "postgres";
const state = vi.hoisted(() => ({ userId: "", sql: undefined as Sql | undefined }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({
  data: { user: { id: state.userId, email: "synthetic@example.test", user_metadata: { role: "ADMIN", ownerUserId: "forged" } } }, error: null,
}) } }) }));
vi.mock("@/db", async () => {
  const target = process.env.ROLES_TEST_DATABASE_URL;
  if (!target) return { db: {} };
  const url = new URL(target);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/artieda_roles_test") throw new Error("Only isolated roles database allowed");
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("@/db/schema");
  state.sql = postgres(target, { max: 2, prepare: false, onnotice: () => {} });
  return { db: drizzle(state.sql, { schema }) };
});
import { getWorkspaceAccess, requireAdminAccess } from "./workspace-access";

describe.skipIf(!process.env.ROLES_TEST_DATABASE_URL)("current memberships and direct PostgreSQL permissions", () => {
  const owner = randomUUID(), staff = randomUUID(), outsider = randomUUID(), unknown = randomUUID();
  const client = randomUUID(), currentCase = randomUUID(), legacyStaffClient = randomUUID();
  let sql: Sql;
  const direct = (actor: string, run: (tx: Sql) => Promise<unknown>) => sql.begin(async transaction => {
    const tx = transaction as unknown as Sql;
    await tx`select set_config('request.jwt.claim.sub', ${actor}, true)`;
    await tx.unsafe("SET LOCAL ROLE authenticated");
    return run(tx);
  });
  beforeAll(async () => {
    sql = state.sql!;
    await sql`insert into auth.users (id,email) values (${owner},'owner@example.test'),(${staff},'staff@example.test'),(${outsider},'other@example.test'),(${unknown},'unknown@example.test')`;
    await sql`insert into app_private.workspace_members (user_id,owner_user_id,display_name,role) values (${owner},${owner},'Victoria','ADMIN'),(${staff},${owner},'Briza','COLLABORATOR'),(${outsider},${outsider},'Otra persona','ADMIN')`;
    await sql`insert into clients (id,user_id,name) values (${client},${owner},'Synthetic office'),(${legacyStaffClient},${staff},'Legacy staff personal row')`;
    await sql`insert into cases (id,user_id,client_id,title,fee,preferred_payment_method) values (${currentCase},${owner},${client},'Synthetic case','1234.56','TRANSFER')`;
    await sql.unsafe("DROP POLICY IF EXISTS roles_test_storage_owner ON storage.objects; CREATE POLICY roles_test_storage_owner ON storage.objects TO authenticated USING (split_part(name,'/',1)=(select auth.uid())::text) WITH CHECK (split_part(name,'/',1)=(select auth.uid())::text)");
    await sql`insert into storage.objects(bucket_id,name) values ('signature-documents',${owner+'/document.pdf'}),('signature-documents',${staff+'/legacy.pdf'})`;
  });
  afterAll(async () => {
    if (!sql) return;
    await sql`delete from storage.objects where name in (${owner+'/document.pdf'},${staff+'/legacy.pdf'})`;
    await sql`delete from clients where id in (${client},${legacyStaffClient})`;
    await sql`delete from auth.users where id in (${owner},${staff},${outsider},${unknown})`;
    await sql.end();
  });
  it("resolves real private membership and preserves owner scope", async () => {
    state.userId=staff;
    expect(await getWorkspaceAccess()).toMatchObject({ actorUserId:staff,ownerUserId:owner,role:"COLLABORATOR" });
    await expect(requireAdminAccess()).rejects.toMatchObject({code:"ACCESS_DENIED"});
    state.userId=owner;
    expect(await requireAdminAccess()).toMatchObject({actorUserId:owner,ownerUserId:owner,role:"ADMIN"});
  });
  it("new unassigned accounts cannot enter", async () => {
    state.userId=unknown;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({code:"ACCESS_DENIED"});
  });
  it("revocation takes effect with the same authenticated identity", async () => {
    state.userId=staff;
    await sql`update app_private.workspace_members set enabled=false where user_id=${staff}`;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({code:"ACCESS_DENIED"});
    await sql`update app_private.workspace_members set enabled=true where user_id=${staff}`;
  });
  it("disabled office prevents collaborator access", async () => {
    state.userId=staff;
    await sql`update app_private.workspace_members set enabled=false where user_id=${owner}`;
    await expect(getWorkspaceAccess()).rejects.toMatchObject({code:"ACCESS_DENIED"});
    await sql`update app_private.workspace_members set enabled=true where user_id=${owner}`;
  });
  it("owner direct API retains financial fields only in their office", async () => {
    const rows=await direct(owner,tx=>tx`select fee,preferred_payment_method from cases where id=${currentCase}`);
    expect(rows).toEqual([{fee:"1234.56",preferred_payment_method:"TRANSFER"}]);
    expect(await direct(outsider,tx=>tx`select id from cases where id=${currentCase}`)).toHaveLength(0);
  });
  it.each([staff,unknown])("direct financial and even self-owned legacy reads are denied to non-admin %s", async actor => {
    expect(await direct(actor,tx=>tx`select fee from cases`)).toHaveLength(0);
    expect(await direct(actor,tx=>tx`select id from clients`)).toHaveLength(0);
    await expect(direct(actor,tx=>tx`insert into clients(user_id,name) values (${actor},'Forbidden')`)).rejects.toMatchObject({code:"42501"});
  });
  it("cannot change financial values through a direct database request", async () => {
    expect(await direct(staff,tx=>tx`update cases set fee=0 where id=${currentCase} returning id`)).toHaveLength(0);
    expect((await sql`select fee from cases where id=${currentCase}`)[0].fee).toBe("1234.56");
  });
  it("collaborators cannot read or elevate protected memberships", async () => {
    await expect(direct(staff,tx=>tx`select * from app_private.workspace_members`)).rejects.toMatchObject({code:"42501"});
    await expect(direct(staff,tx=>tx`update app_private.workspace_members set role='ADMIN', owner_user_id=user_id where user_id=${staff}`)).rejects.toMatchObject({code:"42501"});
  });
  it("signature storage direct access remains owner-only and denies staff legacy paths", async () => {
    expect(await direct(owner,tx=>tx`select name from storage.objects where bucket_id='signature-documents'`)).toEqual([{name:owner+'/document.pdf'}]);
    expect(await direct(staff,tx=>tx`select name from storage.objects where bucket_id='signature-documents'`)).toHaveLength(0);
  });
  it("all 17 business tables have a restrictive admin gate and no anonymous read privilege", async () => {
    const rows=await sql`select tablename,permissive,has_table_privilege('anon',format('%I.%I',schemaname,tablename),'SELECT') as anonymous from pg_policies where schemaname='public' and policyname='workspace_admin_direct_access'`;
    expect(rows).toHaveLength(17);
    for(const row of rows){ expect(row.permissive).toBe("RESTRICTIVE");expect(row.anonymous).toBe(false); }
  });
});
