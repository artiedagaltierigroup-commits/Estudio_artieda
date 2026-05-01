ALTER TYPE "public"."expense_origin" ADD VALUE IF NOT EXISTS 'SAVINGS';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'savings_goal';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'savings_contribution';--> statement-breakpoint
CREATE TYPE "public"."savings_goal_status" AS ENUM('IN_PROGRESS', 'PAUSED');--> statement-breakpoint

CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_amount" numeric(12, 2) NOT NULL,
	"deadline" date,
	"status" "savings_goal_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_target_amount_positive_check" CHECK ("savings_goals"."target_amount" > 0)
);--> statement-breakpoint

CREATE TABLE "savings_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"savings_goal_id" uuid NOT NULL,
	"expense_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"contribution_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_contributions_amount_positive_check" CHECK ("savings_contributions"."amount" > 0)
);--> statement-breakpoint

ALTER TABLE "savings_contributions" ADD CONSTRAINT "savings_contributions_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_contributions" ADD CONSTRAINT "savings_contributions_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "savings_goal_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "savings_goals_user_id_idx" ON "savings_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_goals_status_idx" ON "savings_goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "savings_goals_deadline_idx" ON "savings_goals" USING btree ("user_id","deadline");--> statement-breakpoint
CREATE INDEX "savings_contributions_user_id_idx" ON "savings_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_contributions_savings_goal_id_idx" ON "savings_contributions" USING btree ("savings_goal_id");--> statement-breakpoint
CREATE INDEX "savings_contributions_date_idx" ON "savings_contributions" USING btree ("user_id","contribution_date");--> statement-breakpoint
CREATE INDEX "savings_contributions_expense_id_idx" ON "savings_contributions" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expenses_savings_goal_id_idx" ON "expenses" USING btree ("savings_goal_id");--> statement-breakpoint

REVOKE ALL ON TABLE public.savings_goals FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.savings_contributions FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.savings_goals TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.savings_contributions TO authenticated;--> statement-breakpoint

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "savings_goals_select_own"
ON public.savings_goals
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_goals_insert_own"
ON public.savings_goals
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_goals_update_own"
ON public.savings_goals
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_goals_delete_own"
ON public.savings_goals
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_contributions_select_own"
ON public.savings_contributions
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_contributions_insert_own"
ON public.savings_contributions
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_contributions_update_own"
ON public.savings_contributions
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);--> statement-breakpoint

CREATE POLICY "savings_contributions_delete_own"
ON public.savings_contributions
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);
