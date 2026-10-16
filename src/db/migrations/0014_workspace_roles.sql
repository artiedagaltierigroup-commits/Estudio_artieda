-- Additive role rollout. Existing accounts retain their isolated administrator scope.
-- Shared staff operations are mediated by the server; no direct mixed-column reads.
CREATE SCHEMA IF NOT EXISTS "app_private";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app_private" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'client' BEFORE 'case';--> statement-breakpoint
CREATE TABLE "app_private"."workspace_members" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_role_check" CHECK ("app_private"."workspace_members"."role" in ('ADMIN', 'COLLABORATOR')),
	CONSTRAINT "workspace_members_scope_check" CHECK (("app_private"."workspace_members"."role" = 'ADMIN' and "app_private"."workspace_members"."user_id" = "app_private"."workspace_members"."owner_user_id") or ("app_private"."workspace_members"."role" = 'COLLABORATOR' and "app_private"."workspace_members"."user_id" <> "app_private"."workspace_members"."owner_user_id"))
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "actor_user_id" uuid;--> statement-breakpoint
CREATE INDEX "workspace_members_owner_idx" ON "app_private"."workspace_members" USING btree ("owner_user_id");
--> statement-breakpoint
ALTER TABLE app_private.workspace_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON app_private.workspace_members FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER TABLE app_private.workspace_members
  ADD CONSTRAINT workspace_members_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT workspace_members_owner_fk FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--> statement-breakpoint
INSERT INTO app_private.workspace_members (user_id, owner_user_id, role)
SELECT id, id, 'ADMIN' FROM auth.users;
--> statement-breakpoint
CREATE FUNCTION app_private.is_workspace_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_private.workspace_members m
    WHERE m.user_id = (SELECT auth.uid()) AND m.owner_user_id = m.user_id
      AND m.role = 'ADMIN' AND m.enabled
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_private.is_workspace_admin() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app_private TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_private.is_workspace_admin() TO authenticated;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clients','cases','charges','payments','expenses','recurring_expenses',
    'recurring_expense_occurrences','reminders','savings_goals','savings_contributions',
    'activity_log','client_saved_signatures','signature_documents','signature_events',
    'signature_placements','signature_recipients','signature_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', table_name);
    EXECUTE format('CREATE POLICY workspace_admin_direct_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT app_private.is_workspace_admin())) WITH CHECK ((SELECT app_private.is_workspace_admin()))', table_name);
  END LOOP;
END $$;
--> statement-breakpoint
CREATE POLICY workspace_signature_storage_access ON storage.objects
AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id <> 'signature-documents' OR (SELECT app_private.is_workspace_admin()))
WITH CHECK (bucket_id <> 'signature-documents' OR (SELECT app_private.is_workspace_admin()));
