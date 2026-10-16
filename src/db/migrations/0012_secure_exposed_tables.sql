-- Close direct anonymous access while preserving the existing server-side flows.
-- Public signature tokens are resolved by the backend (postgres/BYPASSRLS).
-- Storage grants, server roles and business rows are deliberately unchanged.
REVOKE ALL PRIVILEGES ON TABLE
  public.client_saved_signatures,
  public.recurring_expense_occurrences,
  public.signature_documents,
  public.signature_events,
  public.signature_requests
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.client_saved_signatures,
  public.recurring_expense_occurrences,
  public.signature_documents,
  public.signature_events,
  public.signature_requests
TO authenticated;
--> statement-breakpoint
ALTER TABLE public.client_saved_signatures ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "client_saved_signatures_select_own"
ON public.client_saved_signatures FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "client_saved_signatures_insert_own"
ON public.client_saved_signatures FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "client_saved_signatures_update_own"
ON public.client_saved_signatures FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "client_saved_signatures_delete_own"
ON public.client_saved_signatures FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
ALTER TABLE public.recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurring_expense_occurrences_select_own"
ON public.recurring_expense_occurrences FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "recurring_expense_occurrences_insert_own"
ON public.recurring_expense_occurrences FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "recurring_expense_occurrences_update_own"
ON public.recurring_expense_occurrences FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "recurring_expense_occurrences_delete_own"
ON public.recurring_expense_occurrences FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
ALTER TABLE public.signature_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "signature_documents_select_own"
ON public.signature_documents FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_documents_insert_own"
ON public.signature_documents FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_documents_update_own"
ON public.signature_documents FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_documents_delete_own"
ON public.signature_documents FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "signature_events_select_own"
ON public.signature_events FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_events_insert_own"
ON public.signature_events FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_events_update_own"
ON public.signature_events FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_events_delete_own"
ON public.signature_events FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "signature_requests_select_own"
ON public.signature_requests FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_requests_insert_own"
ON public.signature_requests FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_requests_update_own"
ON public.signature_requests FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "signature_requests_delete_own"
ON public.signature_requests FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
