ALTER TABLE "savings_contributions" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "savings_contributions" ADD COLUMN "void_reason" text;--> statement-breakpoint
CREATE INDEX "savings_contributions_voided_at_idx" ON "savings_contributions" USING btree ("voided_at");