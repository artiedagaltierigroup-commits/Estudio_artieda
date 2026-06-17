CREATE TYPE "public"."signature_event_type" AS ENUM('created', 'document_uploaded', 'placement_selected', 'sent', 'email_opened', 'link_opened', 'document_viewed', 'signing_started', 'signing_interrupted', 'signed', 'rejected', 'expired', 'cancelled', 'resent', 'downloaded');--> statement-breakpoint
CREATE TYPE "public"."signature_request_status" AS ENUM('DRAFT', 'READY', 'SENT', 'EMAIL_OPENED', 'LINK_OPENED', 'DOCUMENT_VIEWED', 'SIGNING_STARTED', 'SIGNING_INTERRUPTED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE 'sent';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE 'signed';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE 'resent';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE 'downloaded';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'document' BEFORE 'payment';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'signature_request';--> statement-breakpoint
CREATE TABLE "client_saved_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"signer_name" text,
	"signer_email" text,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signature_request_id" uuid NOT NULL,
	"original_file_name" text NOT NULL,
	"original_storage_path" text NOT NULL,
	"signed_storage_path" text,
	"original_sha256" text NOT NULL,
	"signed_sha256" text,
	"page_number" integer DEFAULT 1 NOT NULL,
	"placement_x" numeric(10, 4) NOT NULL,
	"placement_y" numeric(10, 4) NOT NULL,
	"placement_width" numeric(10, 4) NOT NULL,
	"placement_height" numeric(10, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signature_request_id" uuid NOT NULL,
	"type" "signature_event_type" NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"subject" text NOT NULL,
	"message" text,
	"recipient_name" text,
	"recipient_email" text NOT NULL,
	"recipient_tax_id" text,
	"status" "signature_request_status" DEFAULT 'DRAFT' NOT NULL,
	"token_hash" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_saved_signatures" ADD CONSTRAINT "client_saved_signatures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_documents" ADD CONSTRAINT "signature_documents_signature_request_id_signature_requests_id_fk" FOREIGN KEY ("signature_request_id") REFERENCES "public"."signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_signature_request_id_signature_requests_id_fk" FOREIGN KEY ("signature_request_id") REFERENCES "public"."signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_saved_signatures_user_id_idx" ON "client_saved_signatures" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_saved_signatures_client_id_idx" ON "client_saved_signatures" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "signature_documents_user_id_idx" ON "signature_documents" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_documents_request_id_idx" ON "signature_documents" USING btree ("signature_request_id");--> statement-breakpoint
CREATE INDEX "signature_events_user_id_idx" ON "signature_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signature_events_request_id_idx" ON "signature_events" USING btree ("signature_request_id");--> statement-breakpoint
CREATE INDEX "signature_events_created_at_idx" ON "signature_events" USING btree ("signature_request_id","created_at");--> statement-breakpoint
CREATE INDEX "signature_requests_user_id_idx" ON "signature_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signature_requests_client_id_idx" ON "signature_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "signature_requests_case_id_idx" ON "signature_requests" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "signature_requests_status_idx" ON "signature_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "signature_requests_recipient_email_idx" ON "signature_requests" USING btree ("recipient_email");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_requests_token_hash_idx" ON "signature_requests" USING btree ("token_hash");