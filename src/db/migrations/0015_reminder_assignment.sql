ALTER TABLE "reminders" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "assignee_user_id" uuid;--> statement-breakpoint
ALTER TABLE "app_private"."workspace_members" ADD COLUMN "display_name" text;--> statement-breakpoint
UPDATE app_private.workspace_members AS member
SET display_name = CASE
  WHEN lower(auth_user.email) = 'estudioartiedav@gmail.com' THEN 'Victoria'
  WHEN lower(auth_user.email) = 'legalesartieda@gmail.com' THEN 'Briza'
  ELSE COALESCE(NULLIF(split_part(auth_user.email, '@', 1), ''), 'Usuario')
END
FROM auth.users AS auth_user
WHERE auth_user.id = member.user_id;--> statement-breakpoint
UPDATE app_private.workspace_members SET display_name = 'Usuario' WHERE display_name IS NULL;--> statement-breakpoint
ALTER TABLE "app_private"."workspace_members" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
UPDATE reminders
SET created_by_user_id = user_id;--> statement-breakpoint
DO $$
DECLARE
  artieda_owner_id uuid;
  briza_user_id uuid;
  active_assistant_count integer;
BEGIN
  SELECT auth_user.id INTO artieda_owner_id
  FROM auth.users AS auth_user
  WHERE lower(auth_user.email) = 'estudioartiedav@gmail.com';
  IF artieda_owner_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la cuenta de Victoria';
  END IF;

  SELECT count(*)::integer INTO active_assistant_count
  FROM app_private.workspace_members AS member
  WHERE member.owner_user_id = artieda_owner_id
    AND member.role = 'COLLABORATOR'
    AND member.enabled;
  IF active_assistant_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba exactamente una asistente legal activa para Estudio Artieda y se encontraron %', active_assistant_count;
  END IF;

  SELECT member.user_id INTO briza_user_id
  FROM app_private.workspace_members AS member
  JOIN auth.users AS auth_user ON auth_user.id = member.user_id
  WHERE member.owner_user_id = artieda_owner_id
    AND member.role = 'COLLABORATOR'
    AND member.enabled
    AND lower(auth_user.email) = 'legalesartieda@gmail.com';
  IF briza_user_id IS NULL THEN
    RAISE EXCEPTION 'La única asistente activa de Estudio Artieda no es Briza';
  END IF;

  UPDATE public.reminders
  SET assignee_user_id = briza_user_id
  WHERE user_id = artieda_owner_id;
END $$;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_created_by_user_id_workspace_members_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "app_private"."workspace_members"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_assignee_user_id_workspace_members_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "app_private"."workspace_members"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reminders_user_assignee_idx" ON "reminders" USING btree ("user_id","assignee_user_id");
