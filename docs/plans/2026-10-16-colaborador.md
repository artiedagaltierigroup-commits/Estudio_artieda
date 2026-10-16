# Perfil colaborador — Implementation Plan

> Execution: implement task by task in the isolated release worktree, with failing authorization tests before implementation and independent reviews.

**Goal:** Preserve the existing owner's full access and prepare a collaborator who can work with all office clients, cases, reminders/tasks and signatures, without financial access. No account is created until its email is supplied.

**Architecture:** A private database membership maps each authenticated actor to an office owner and one of two fixed roles. All server entry points authorize against current database membership; collaborator reads use explicit operational projections, while existing financial reads are administrator-only. Existing Data API ownership policies remain and receive a restrictive administrator gate, so collaborators use authorized server operations and cannot retrieve mixed financial columns directly.

**Tech Stack:** Next.js 15, Supabase Auth/Postgres/Storage, Drizzle, Vitest, native PostgreSQL 17 (no Docker).

## Approved scope

- ADMIN: existing owner and pre-existing isolated accounts retain their current scope. The named owner is verified before migration.
- COLLABORATOR: all records belonging to the assigned office; read/create/edit clients, cases, reminders and signatures; complete/reopen reminders. No permanent deletion, financial data, financial actions, history or statistics.
- Existing free text and signature PDFs are shared unchanged, as explicitly accepted by the user. Financial structured fields and derived debt states are excluded.
- New unknown accounts have no access. Membership cannot be set through user metadata or browser requests. No invitation or email is sent by this change.
- Records keep the office owner's user_id; actor_user_id attributes shared changes in audit logs.

## Shared implementation contract

`src/lib/workspace-access.ts` exports `getWorkspaceAccess()` and `requireAdminAccess()`, returning `{ actorUserId, ownerUserId, role, email }`; role is `ADMIN | COLLABORATOR`. Both verify Supabase getUser and current private membership. Unknown/disabled accounts fail closed. `src/lib/workspace-permissions.ts` holds safe role types and route helpers for client UI.

Operational reads are separate exports in `src/actions/operational.ts`: `getOperationalClients(query?)`, `getOperationalClient(id)`, `getOperationalCases({query?,status?}?)`, `getOperationalCase(id)`. Clients and cases expose only allowlisted nonfinancial columns; case detail includes client and reminders; client detail includes cases and reminders. Existing `getClients/getClient/getCases/getCase/getCaseRecord` remain administrator-only. Shared mutations retain their names, scope through membership and refuse collaborator financial fields. `getClientRecord` and reminder reads are safe shared operations. `logActivity` accepts optional `actorUserId`.

## Task 1: Access foundation and database protections

Files: `src/lib/workspace-access.ts`, `src/lib/workspace-permissions.ts`, `src/db/schema.ts`, `src/db/migrations/*`, `src/lib/activity-log.ts`, authorization tests.
1. Write tests for owner, collaborator, disabled/unknown user and forged metadata.
2. Run tests and confirm failure before implementation.
3. Add private membership, grandfather existing accounts as isolated administrators, audit actor field and restrictive direct API policies; no existing business row changes.
4. Implement access resolution and financial action guards. Test allow/deny on real local PostgreSQL with synthetic data.

## Task 2: Shared operational actions

Files: `src/actions/{clients,cases,reminders,operational}.ts` and focused tests.
1. Write failing tests for shared scope, financial field rejection/preservation, no deletion and no nested financial leakage.
2. Implement explicit projections and shared mutations with actor audit attribution.
3. Verify another office cannot be read or modified and existing owner workflows retain behavior.

## Task 3: Role-aware screens

Files: dashboard pages, layout/shell/navigation, operational components, case forms and reminders UI.
1. Add tests for collaborator navigation and forbidden direct URLs.
2. Render operational variants before any administrator query; keep owner screens intact.
3. Remove financial inputs, actions, summaries, filters and visibility toggle from collaborator views. Use reminder-only calendar and relevant help.
4. Inspect both profiles with synthetic fixtures; no production business writes.

## Task 4: Signature access

Files: `src/actions/signatures.ts`, authenticated signature routes, signature components/tests.
1. Test collaborator access to office requests and downloads, other-office denial, nested case financial exclusion and delete denial.
2. Use owner scope for storage paths and actor identity for auditing; preserve token-authorized public signing.
3. Verify send preparation without sending test emails.

## Task 5: Verification and production release

1. Run focused tests, complete suite, typecheck, lint and production build. Review all exported server actions and API routes for missing guards.
2. Make a fresh native backup; verify hashes and restore to a separate local database. Verify the named owner's unique identity and counts read-only.
3. Apply only the tested additive migration transactionally, retaining a rollback procedure. Verify owner membership and policy state without exposing personal records.
4. Deploy the tested release and verify public health, unauthenticated rejection and protected database behavior. Do not claim an authenticated production UI test without a valid session.
5. Save evidence and a committed-code backup. Preserve unrelated primary-checkout changes. Document future secure account enrollment once an address is provided.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/column-level-security

RLS controls rows, not individual columns. Keeping direct collaborator access denied and returning explicit server projections prevents the fee/payment-method leak without changing existing owner's data.
