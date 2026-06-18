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

WITH legacy_recipients AS (
	SELECT
		gen_random_uuid() AS id,
		requests."user_id",
		requests."id" AS signature_request_id,
		requests."client_id",
		COALESCE(NULLIF(split_part(names.full_name, ' ', 1), ''), requests."recipient_email") AS first_name,
		CASE
			WHEN position(' ' in names.full_name) > 0 THEN substring(names.full_name from position(' ' in names.full_name) + 1)
			ELSE ''
		END AS last_name,
		NULLIF(names.full_name, '') AS full_name,
		requests."recipient_email" AS email,
		requests."recipient_tax_id" AS tax_id,
		(CASE
			WHEN requests."status"::text = 'REJECTED' THEN 'CANCELLED'
			WHEN requests."status"::text = 'PARTIALLY_SIGNED' THEN 'SIGNED'
			ELSE requests."status"::text
		END)::"public"."signature_recipient_status" AS status,
		requests."token_hash",
		requests."token_expires_at",
		requests."sent_at",
		requests."signed_at",
		COALESCE(requests."cancelled_at", requests."rejected_at") AS cancelled_at,
		'#9A4E69' AS color,
		0 AS sort_order,
		documents."signature_storage_path",
		documents."signature_sha256",
		requests."created_at",
		requests."updated_at"
	FROM "signature_requests" requests
	LEFT JOIN "signature_documents" documents ON documents."signature_request_id" = requests."id"
	CROSS JOIN LATERAL (
		SELECT trim(regexp_replace(coalesce(requests."recipient_name", ''), '[[:space:]]+', ' ', 'g')) AS full_name
	) names
	WHERE NOT EXISTS (
		SELECT 1
		FROM "signature_recipients" existing
		WHERE existing."signature_request_id" = requests."id"
	)
),
inserted_recipients AS (
	INSERT INTO "signature_recipients" (
		"id",
		"user_id",
		"signature_request_id",
		"client_id",
		"first_name",
		"last_name",
		"full_name",
		"email",
		"tax_id",
		"status",
		"token_hash",
		"token_expires_at",
		"sent_at",
		"signed_at",
		"cancelled_at",
		"color",
		"sort_order",
		"signature_storage_path",
		"signature_sha256",
		"created_at",
		"updated_at"
	)
	SELECT
		id,
		user_id,
		signature_request_id,
		client_id,
		first_name,
		last_name,
		full_name,
		email,
		tax_id,
		status,
		token_hash,
		token_expires_at,
		sent_at,
		signed_at,
		cancelled_at,
		color,
		sort_order,
		signature_storage_path,
		signature_sha256,
		created_at,
		updated_at
	FROM legacy_recipients
	RETURNING "id", "signature_request_id"
)
INSERT INTO "signature_placements" (
	"user_id",
	"signature_request_id",
	"recipient_id",
	"page_number",
	"placement_x",
	"placement_y",
	"placement_width",
	"placement_height",
	"sort_order",
	"created_at",
	"updated_at"
)
SELECT
	documents."user_id",
	documents."signature_request_id",
	legacy_recipients.id,
	documents."page_number",
	documents."placement_x",
	documents."placement_y",
	documents."placement_width",
	documents."placement_height",
	0,
	documents."created_at",
	documents."updated_at"
FROM legacy_recipients
INNER JOIN inserted_recipients ON inserted_recipients."id" = legacy_recipients.id
INNER JOIN "signature_documents" documents ON documents."signature_request_id" = legacy_recipients.signature_request_id
WHERE NOT EXISTS (
	SELECT 1
	FROM "signature_placements" existing
	WHERE existing."recipient_id" = legacy_recipients.id
);--> statement-breakpoint

UPDATE "signature_events" events
SET "signature_recipient_id" = recipients."id"
FROM "signature_recipients" recipients
WHERE events."signature_request_id" = recipients."signature_request_id"
	AND events."signature_recipient_id" IS NULL;--> statement-breakpoint

UPDATE "signature_events" events
SET "signature_placement_id" = placements."id"
FROM "signature_placements" placements
WHERE events."signature_request_id" = placements."signature_request_id"
	AND events."type" = 'placement_selected'
	AND events."signature_placement_id" IS NULL;--> statement-breakpoint

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
