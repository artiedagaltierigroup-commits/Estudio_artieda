revoke all on table public.clients from anon;
revoke all on table public.cases from anon;
revoke all on table public.charges from anon;
revoke all on table public.payments from anon;
revoke all on table public.expenses from anon;
revoke all on table public.recurring_expenses from anon;
revoke all on table public.reminders from anon;
revoke all on table public.activity_log from anon;

grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.cases to authenticated;
grant select, insert, update, delete on table public.charges to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.recurring_expenses to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;
grant select, insert on table public.activity_log to authenticated;

alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.reminders enable row level security;
alter table public.activity_log enable row level security;

create policy "clients_select_own"
on public.clients
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "clients_insert_own"
on public.clients
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "clients_update_own"
on public.clients
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "clients_delete_own"
on public.clients
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "cases_select_own"
on public.cases
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "cases_insert_own"
on public.cases
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "cases_update_own"
on public.cases
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "cases_delete_own"
on public.cases
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "charges_select_own"
on public.charges
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "charges_insert_own"
on public.charges
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "charges_update_own"
on public.charges
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "charges_delete_own"
on public.charges
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "payments_select_own"
on public.payments
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "payments_insert_own"
on public.payments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "payments_update_own"
on public.payments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "payments_delete_own"
on public.payments
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "expenses_select_own"
on public.expenses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "expenses_insert_own"
on public.expenses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "expenses_update_own"
on public.expenses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "expenses_delete_own"
on public.expenses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "recurring_expenses_select_own"
on public.recurring_expenses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "recurring_expenses_insert_own"
on public.recurring_expenses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "recurring_expenses_update_own"
on public.recurring_expenses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "recurring_expenses_delete_own"
on public.recurring_expenses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "reminders_select_own"
on public.reminders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "reminders_insert_own"
on public.reminders
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "reminders_update_own"
on public.reminders
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "reminders_delete_own"
on public.reminders
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_log_select_own"
on public.activity_log
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_log_insert_own"
on public.activity_log
for insert
to authenticated
with check ((select auth.uid()) = user_id);
