ALTER TYPE "frequency" ADD VALUE IF NOT EXISTS 'semiannual';
CREATE TYPE "public"."recurring_expense_mode" AS ENUM('AUTOMATIC', 'PAYABLE');--> statement-breakpoint
CREATE TYPE "public"."recurring_expense_occurrence_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'GENERATED');--> statement-breakpoint
CREATE TYPE "public"."expense_origin" AS ENUM('MANUAL', 'RECURRING_AUTOMATIC', 'RECURRING_PAYABLE');--> statement-breakpoint

ALTER TABLE "expenses" ADD COLUMN "origin" "expense_origin" DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurring_expense_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_expense_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "recurring_expenses" ADD COLUMN "mode" "recurring_expense_mode" DEFAULT 'AUTOMATIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "priority" "reminder_priority" DEFAULT 'MEDIUM' NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "notify_days_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "payable_day_of_month" integer;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_notify_days_before_check" CHECK ("recurring_expenses"."notify_days_before" >= 0 AND "recurring_expenses"."notify_days_before" <= 15);--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_payable_day_of_month_check" CHECK ("recurring_expenses"."payable_day_of_month" IS NULL OR ("recurring_expenses"."payable_day_of_month" >= 1 AND "recurring_expenses"."payable_day_of_month" <= 31));--> statement-breakpoint

CREATE TABLE "recurring_expense_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "recurring_expense_id" uuid NOT NULL,
  "due_date" date NOT NULL,
  "status" "recurring_expense_occurrence_status" DEFAULT 'PENDING' NOT NULL,
  "expense_id" uuid,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "recurring_expense_occurrences" ADD CONSTRAINT "recurring_expense_occurrences_recurring_expense_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_occurrences" ADD CONSTRAINT "recurring_expense_occurrences_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "recurring_expense_occurrences_user_id_idx" ON "recurring_expense_occurrences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_expense_occurrences_due_date_idx" ON "recurring_expense_occurrences" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "recurring_expense_occurrences_status_idx" ON "recurring_expense_occurrences" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recurring_expense_occurrences_recurring_expense_id_idx" ON "recurring_expense_occurrences" USING btree ("recurring_expense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_expense_occurrences_unique_idx" ON "recurring_expense_occurrences" USING btree ("recurring_expense_id","due_date");
