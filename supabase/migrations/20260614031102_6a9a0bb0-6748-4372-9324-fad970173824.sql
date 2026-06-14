-- Step 4: live snapshot wrapper RPC. Mirrors vcr_plan_snapshots SELECT scoping
-- (creator / approver on plan / project team member) and delegates to the
-- shared _vcr_build_snapshot_payload. _vcr_build_snapshot_payload is NOT
-- exposed to the client (no access check); this wrapper is the only client
-- entry point for the "live" diff state.
CREATE OR REPLACE FUNCTION public.vcr_plan_live_snapshot(p_handover_point_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_caller uuid := auth.uid(); v_ok boolean;
BEGIN
  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'p_handover_point_id is required';
  END IF;
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vcr_plan_approvers a
    WHERE a.handover_point_id = p_handover_point_id AND a.user_id = v_caller
  ) OR EXISTS (
    SELECT 1
    FROM public.p2a_handover_points hp
    JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
    JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
    WHERE hp.id = p_handover_point_id AND ptm.user_id = v_caller
  ) OR EXISTS (
    SELECT 1 FROM public.p2a_handover_points hp
    WHERE hp.id = p_handover_point_id AND hp.created_by = v_caller
  )
  INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN public._vcr_build_snapshot_payload(p_handover_point_id);
END;
$$;

REVOKE ALL ON FUNCTION public.vcr_plan_live_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vcr_plan_live_snapshot(uuid) TO authenticated;