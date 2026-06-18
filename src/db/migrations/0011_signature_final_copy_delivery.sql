ALTER TABLE "signature_requests" ADD COLUMN "send_signed_copy_to_recipients" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "signed_copy_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD COLUMN "signed_copy_token_hash" text;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD COLUMN "signed_copy_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD COLUMN "signed_copy_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "signature_recipients_signed_copy_token_hash_idx" ON "signature_recipients" USING btree ("signed_copy_token_hash");
