CREATE TYPE "public"."signature_recipient_status" AS ENUM('DRAFT', 'READY', 'SENT', 'EMAIL_OPENED', 'LINK_OPENED', 'DOCUMENT_VIEWED', 'SIGNING_STARTED', 'SIGNING_INTERRUPTED', 'SIGNED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."signature_request_status" ADD VALUE 'PARTIALLY_SIGNED' BEFORE 'SIGNED';--> statement-breakpoint
CREATE TABLE "signature_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signature_request_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"page_number" integer DEFAULT 1 NOT NULL,
	"placement_x" numeric(10, 4) NOT NULL,
	"placement_y" numeric(10, 4) NOT NULL,
	"placement_width" numeric(10, 4) NOT NULL,
	"placement_height" numeric(10, 4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signature_request_id" uuid NOT NULL,
	"client_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"full_name" text,
	"email" text NOT NULL,
	"tax_id" text,
	"status" "signature_recipient_status" DEFAULT 'DRAFT' NOT NULL,
	"token_hash" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"color" text DEFAULT '#9A4E69' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"signature_storage_path" text,
	"signature_sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signature_events" ADD COLUMN "signature_recipient_id" uuid;--> statement-breakpoint
ALTER TABLE "signature_events" ADD COLUMN "signature_placement_id" uuid;--> statement-breakpoint
ALTER TABLE "signature_placements" ADD CONSTRAINT "signature_placements_signature_request_id_signature_requests_id_fk" FOREIGN KEY ("signature_request_id") REFERENCES "public"."signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_placements" ADD CONSTRAINT "signature_placements_recipient_id_signature_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."signature_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_signature_request_id_signature_requests_id_fk" FOREIGN KEY ("signature_request_id") REFERENCES "public"."signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signature_placements_user_id_idx" ON "signature_placements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signature_placements_request_id_idx" ON "signature_placements" USING btree ("signature_request_id");--> statement-breakpoint
CREATE INDEX "signature_placements_recipient_id_idx" ON "signature_placements" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "signature_placements_recipient_sort_idx" ON "signature_placements" USING btree ("recipient_id","sort_order");--> statement-breakpoint
CREATE INDEX "signature_recipients_user_id_idx" ON "signature_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signature_recipients_request_id_idx" ON "signature_recipients" USING btree ("signature_request_id");--> statement-breakpoint
CREATE INDEX "signature_recipients_client_id_idx" ON "signature_recipients" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "signature_recipients_status_idx" ON "signature_recipients" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "signature_recipients_email_idx" ON "signature_recipients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "signature_recipients_request_sort_idx" ON "signature_recipients" USING btree ("signature_request_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_recipients_token_hash_idx" ON "signature_recipients" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_signature_recipient_id_signature_recipients_id_fk" FOREIGN KEY ("signature_recipient_id") REFERENCES "public"."signature_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_signature_placement_id_signature_placements_id_fk" FOREIGN KEY ("signature_placement_id") REFERENCES "public"."signature_placements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

REVOKE ALL ON TABLE public.signature_recipients FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.signature_placements FROM anon;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signature_recipients TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signature_placements TO authenticated;--> statement-breakpoint

ALTER TABLE public.signature_recipients ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.signature_placements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "signature_recipients_select_own"
ON public.signature_recipients
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_recipients_insert_own"
ON public.signature_recipients
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_recipients_update_own"
ON public.signature_recipients
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_recipients_delete_own"
ON public.signature_recipients
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_placements_select_own"
ON public.signature_placements
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_placements_insert_own"
ON public.signature_placements
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_placements_update_own"
ON public.signature_placements
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "signature_placements_delete_own"
ON public.signature_placements
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);
