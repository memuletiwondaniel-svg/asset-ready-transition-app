CREATE OR REPLACE FUNCTION public.revise_orp_plan(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan       RECORD;
  v_new_ver    INT;
  v_user_id    UUID;
  v_proj_code  TEXT;
  v_dedupe     TEXT;
  v_existing   UUID;
BEGIN
  SELECT * INTO v_plan FROM public.orp_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'orp_plan % not found', p_plan_id; END IF;
  IF v_plan.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'revise_orp_plan: plan % must be APPROVED to revise (currently %)', p_plan_id, v_plan.status;
  END IF;

  v_new_ver := COALESCE(v_plan.version,1) + 1;
  v_user_id := public.resolve_project_role_user(v_plan.project_id, 'ORA Lead');

  UPDATE public.orp_plans
     SET version = v_new_ver,
         status  = 'PENDING_APPROVAL',
         updated_at = now()
   WHERE id = p_plan_id;

  -- Unique(orp_plan_id, approver_role) on orp_approvals — there can only be
  -- one ORA Lead row per plan. Reuse it: reset to PENDING at new cycle.
  SELECT id INTO v_existing FROM public.orp_approvals
   WHERE orp_plan_id = p_plan_id AND approver_role = 'ORA Lead' LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.orp_approvals (orp_plan_id, approver_role, approver_user_id, status, cycle)
    VALUES (p_plan_id, 'ORA Lead', v_user_id, 'PENDING', v_new_ver);
  ELSE
    UPDATE public.orp_approvals
       SET status = 'PENDING',
           cycle  = v_new_ver,
           approver_user_id = v_user_id,
           approved_at = NULL,
           comments = NULL
     WHERE id = v_existing;
  END IF;

  SELECT COALESCE(project_id_prefix,'') || '-' || COALESCE(project_id_number::text,'')
    INTO v_proj_code FROM public.projects WHERE id = v_plan.project_id;

  v_dedupe := 'review_ora_plan:' || p_plan_id::text || ':ORA Lead:' || v_new_ver::text;
  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (
      v_user_id,
      v_proj_code || ': Re-approve revised ORA Plan (v' || v_new_ver::text || ')',
      'The ORA Plan has been revised. Review and re-approve.',
      'approval','pending','High',
      v_dedupe,
      jsonb_build_object(
        'source','ora_workflow','project_id', v_plan.project_id,'project_code', v_proj_code,
        'plan_id', p_plan_id,'action','review_ora_plan','approver_role','ORA Lead',
        'revision', true, 'plan_version', v_new_ver
      )
    );
  END IF;

  RETURN jsonb_build_object('plan_id', p_plan_id, 'new_version', v_new_ver, 'ora_lead_user_id', v_user_id);
END;
$fn$;