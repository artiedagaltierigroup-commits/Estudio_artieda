DO $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE app_private.workspace_members AS member
  SET display_name = 'Brisa'
  FROM auth.users AS auth_user
  WHERE auth_user.id = member.user_id
    AND lower(auth_user.email) = lower('legalesartieda@gmail.com')
    AND member.role = 'COLLABORATOR'
    AND member.enabled = true
    AND member.display_name = 'Briza';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows <> 1 THEN
    RAISE EXCEPTION 'Se esperaba corregir exactamente un perfil de Briza a Brisa; filas actualizadas: %', updated_rows;
  END IF;
END $$;
