-- Mig 10a — shared catalog resolver for task-generation triggers.
--
-- Replaces the hand-maintained LOWER(role)=ANY(...) and SIMILAR TO '%snr ora%'
-- string-match lists in task triggers with a single catalog-backed lookup.
-- This is the 4th-role-matcher fix: all task triggers now resolve the same
-- way the approval gates and validate_approver_role_label do — via roles.name
-- with is_active=true and is_retired=false.
--
-- Returns the user_id holding p_role_label on p_project_id, or NULL if the
-- label is invalid/retired or no team member holds it. NULL return is the
-- explicit signal "no one to assign to" — callers must handle it.
--
-- Shape mirrors p2a_plan_is_approved / validate_approver_role_label:
-- STABLE SECURITY DEFINER, search_path locked to public, EXECUTE revoked
-- from PUBLIC/anon, granted to authenticated for trigger invocation under
-- RLS.

CREATE OR REPLACE FUNCTION public.resolve_project_role_user(
  p_project_id uuid,
  p_role_label text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_project_id IS NULL OR p_role_label IS NULL OR length(btrim(p_role_label)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT ptm.user_id INTO v_user_id
  FROM public.project_team_members ptm
  JOIN public.roles r ON r.name = ptm.role
  WHERE ptm.project_id = p_project_id
    AND ptm.role = p_role_label
    AND r.is_active = true
    AND r.is_retired = false
  LIMIT 1;

  RETURN v_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_project_role_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_project_role_user(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.resolve_project_role_user(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.resolve_project_role_user(uuid, text) TO service_role;