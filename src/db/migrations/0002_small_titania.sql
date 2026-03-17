CREATE TYPE "public"."case_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "priority" "case_priority" DEFAULT 'MEDIUM' NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "preferred_payment_method" text;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "applies_to_month" date;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "activity_log_user_id_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "cases_user_id_idx" ON "cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cases_client_id_idx" ON "cases" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "cases_user_client_status_idx" ON "cases" USING btree ("user_id","client_id","status");--> statement-breakpoint
CREATE INDEX "cases_priority_idx" ON "cases" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "charges_user_id_idx" ON "charges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "charges_case_id_idx" ON "charges" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "charges_due_date_idx" ON "charges" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "charges_follow_up_date_idx" ON "charges" USING btree ("user_id","follow_up_date");--> statement-breakpoint
CREATE INDEX "charges_user_case_status_idx" ON "charges" USING btree ("user_id","case_id","status");--> statement-breakpoint
CREATE INDEX "charges_cancelled_at_idx" ON "charges" USING btree ("cancelled_at");--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "expenses_user_id_idx" ON "expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "expenses_applies_to_month_idx" ON "expenses" USING btree ("user_id","applies_to_month");--> statement-breakpoint
CREATE INDEX "expenses_voided_at_idx" ON "expenses" USING btree ("voided_at");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_charge_id_idx" ON "payments" USING btree ("charge_id");--> statement-breakpoint
CREATE INDEX "payments_payment_date_idx" ON "payments" USING btree ("user_id","payment_date");--> statement-breakpoint
CREATE INDEX "recurring_expenses_user_id_idx" ON "recurring_expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_expenses_active_idx" ON "recurring_expenses" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "recurring_expenses_frequency_idx" ON "recurring_expenses" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "reminders_user_id_idx" ON "reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminders_date_idx" ON "reminders" USING btree ("user_id","reminder_date");--> statement-breakpoint
CREATE INDEX "reminders_completion_idx" ON "reminders" USING btree ("user_id","completed");--> statement-breakpoint
CREATE INDEX "reminders_case_idx" ON "reminders" USING btree ("user_id","case_id");--> statement-breakpoint
CREATE INDEX "reminders_client_idx" ON "reminders" USING btree ("user_id","client_id");--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_date_order_check" CHECK ("cases"."end_date" IS NULL OR "cases"."start_date" IS NULL OR "cases"."end_date" >= "cases"."start_date");--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_amount_positive_check" CHECK ("charges"."amount_total" > 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_positive_check" CHECK ("expenses"."amount" > 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive_check" CHECK ("payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_amount_positive_check" CHECK ("recurring_expenses"."amount" > 0);--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_date_order_check" CHECK ("recurring_expenses"."end_date" IS NULL OR "recurring_expenses"."end_date" >= "recurring_expenses"."start_date");