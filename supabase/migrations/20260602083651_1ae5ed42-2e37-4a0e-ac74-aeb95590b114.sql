-- E (cross-cutting): rejection cascade for ORA / P2A / VCR
-- Extends sync_ora_rejection_to_plan and sync_p2a_rejection_to_plan to:
--   (1) cancel sibling PENDING approver rows in the same cycle
--   (2) cancel matching sibling user_tasks (review_*_plan)
--   (3) create a 'Revise <Plan>' user_task assigned to Sr ORA Engr
--   (4) for VCR: reset p2a_handover_points.execution_plan_status to 'DRAFT'
-- All inserts are dedupe-keyed; safe to re-fire.

CREATE OR REPLACE FUNCTION public.sync_ora_rejection_to_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rejector_name TEXT;
  v_proj_id UUID;
  v_proj_code TEXT;
  v_sr_engr UUID;
  v_dedupe TEXT;
  v_cancelled_roles TEXT[];
BEGIN
  IF NEW.status = 'REJECTED' THEN
    SELECT full_name INTO v_rejector_name FROM public.profiles WHERE user_id = NEW.approver_user_id LIMIT 1;

    -- existing: stamp plan + tasks + history
    UPDATE public.orp_plans SET
      last_rejection_comment = NEW.comments,
      last_rejected_by_name  = COALESCE(v_rejector_name, NEW.approver_role),
      last_rejected_by_role  = NEW.approver_role,
      last_rejected_at       = COALESCE(NEW.approved_at, now()),
      status = 'DRAFT'
    WHERE id = NEW.orp_plan_id;

    UPDATE public.user_tasks SET
      metadata = jsonb_set(jsonb_set(jsonb_set(jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{last_rejection_role}',    to_jsonb(NEW.approver_role)),
        '{last_rejection_comment}', to_jsonb(COALESCE(NEW.comments, ''))),
        '{last_rejection_at}',      to_jsonb(COALESCE(NEW.approved_at::text, now()::text))),
        '{plan_status}', '"DRAFT"'::jsonb)
    WHERE type IN ('task', 'ora_plan_creation')
      AND metadata->>'source' = 'ora_workflow'
      AND metadata->>'project_id' = (SELECT project_id::text FROM public.orp_plans WHERE id = NEW.orp_plan_id);

    INSERT INTO public.orp_approval_history (
      orp_plan_id, original_approval_id, user_id, role_name, status, comments, approved_at, cycle
    )
    SELECT NEW.orp_plan_id, NEW.id, NEW.approver_user_id, NEW.approver_role, 'REJECTED',
      NEW.comments, COALESCE(NEW.approved_at, now()),
      COALESCE((SELECT MAX(cycle) FROM public.orp_approval_history WHERE orp_plan_id = NEW.orp_plan_id), 0) + 1;

    -- (1) cancel sibling PENDING approvers of the same cycle
    SELECT array_agg(approver_role) INTO v_cancelled_roles
    FROM public.orp_approvals
    WHERE orp_plan_id = NEW.orp_plan_id
      AND cycle = NEW.cycle
      AND id <> NEW.id
      AND status = 'PENDING';

    IF v_cancelled_roles IS NOT NULL AND array_length(v_cancelled_roles, 1) > 0 THEN
      DELETE FROM public.orp_approvals
      WHERE orp_plan_id = NEW.orp_plan_id
        AND cycle = NEW.cycle
        AND id <> NEW.id
        AND status = 'PENDING';

      -- (2) cancel sibling review tasks
      UPDATE public.user_tasks
      SET status = 'cancelled', updated_at = now()
      WHERE status IN ('pending', 'waiting', 'in_progress')
        AND metadata->>'source' = 'ora_workflow'
        AND metadata->>'action' = 'review_ora_plan'
        AND metadata->>'plan_id' = NEW.orp_plan_id::text
        AND metadata->>'approver_role' = ANY (v_cancelled_roles);
    END IF;

    -- (3) Revise task for Sr ORA Engr
    SELECT p.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''), p.ora_engineer_id
      INTO v_proj_id, v_proj_code, v_sr_engr
    FROM public.orp_plans p
    JOIN public.projects pr ON pr.id = p.project_id
    WHERE p.id = NEW.orp_plan_id;

    IF v_sr_engr IS NOT NULL THEN
      v_dedupe := 'revise_ora_plan:'||NEW.orp_plan_id::text||':'||NEW.cycle::text;
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
      SELECT v_sr_engr,
        v_proj_code || ': Revise ORA Plan',
        'Address the rejection by ' || NEW.approver_role || ' and resubmit the ORA Plan',
        'task', 'pending', 'High', v_dedupe,
        jsonb_build_object(
          'source','ora_workflow','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', NEW.orp_plan_id, 'action','revise_ora_plan',
          'rejected_by_role', NEW.approver_role,
          'rejection_cycle', NEW.cycle,
          'rejection_comments', COALESCE(NEW.comments, ''))
      WHERE NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.sync_p2a_rejection_to_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_id UUID;
  v_proj_code TEXT;
  v_vcr_code TEXT;
  v_sr_engr UUID;
  v_dedupe TEXT;
  v_cancelled_roles TEXT[];
  v_is_vcr BOOLEAN := (NEW.stage = 'VCR');
BEGIN
  IF NEW.status <> 'REJECTED' THEN RETURN NEW; END IF;

  -- existing: stamp plan with last_rejection_*
  UPDATE public.p2a_handover_plans
  SET last_rejection_comment = COALESCE(NEW.comments, 'Rejected by approver'),
      last_rejected_by_role  = NEW.role_name,
      last_rejected_at       = COALESCE(NEW.approved_at, now()),
      updated_at             = now()
  WHERE id = NEW.handover_id;

  -- Resolve project + Sr ORA Engr + (VCR) point/code
  IF v_is_vcr THEN
    SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''), pt.vcr_code
      INTO v_proj_id, v_proj_code, v_vcr_code
    FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pt.id = NEW.point_id;
  ELSE
    SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
      INTO v_proj_id, v_proj_code
    FROM public.p2a_handover_plans pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pl.id = NEW.handover_id;
  END IF;

  v_sr_engr := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');

  -- (1) cancel sibling PENDING approvers (same handover, stage, cycle, point scope)
  IF v_is_vcr THEN
    SELECT array_agg(role_name) INTO v_cancelled_roles
    FROM public.p2a_handover_approvers
    WHERE handover_id = NEW.handover_id
      AND stage = 'VCR'
      AND point_id = NEW.point_id
      AND cycle = NEW.cycle
      AND id <> NEW.id
      AND status = 'PENDING';
  ELSE
    SELECT array_agg(role_name) INTO v_cancelled_roles
    FROM public.p2a_handover_approvers
    WHERE handover_id = NEW.handover_id
      AND stage = 'P2A'
      AND point_id IS NULL
      AND cycle = NEW.cycle
      AND id <> NEW.id
      AND status = 'PENDING';
  END IF;

  IF v_cancelled_roles IS NOT NULL AND array_length(v_cancelled_roles, 1) > 0 THEN
    IF v_is_vcr THEN
      DELETE FROM public.p2a_handover_approvers
      WHERE handover_id = NEW.handover_id AND stage = 'VCR' AND point_id = NEW.point_id
        AND cycle = NEW.cycle AND id <> NEW.id AND status = 'PENDING';

      UPDATE public.user_tasks
      SET status = 'cancelled', updated_at = now()
      WHERE status IN ('pending', 'waiting', 'in_progress')
        AND metadata->>'source' = 'p2a_handover'
        AND metadata->>'action' = 'review_vcr_plan'
        AND metadata->>'point_id' = NEW.point_id::text
        AND metadata->>'approver_role' = ANY (v_cancelled_roles);
    ELSE
      DELETE FROM public.p2a_handover_approvers
      WHERE handover_id = NEW.handover_id AND stage = 'P2A' AND point_id IS NULL
        AND cycle = NEW.cycle AND id <> NEW.id AND status = 'PENDING';

      UPDATE public.user_tasks
      SET status = 'cancelled', updated_at = now()
      WHERE status IN ('pending', 'waiting', 'in_progress')
        AND metadata->>'source' = 'p2a_handover'
        AND metadata->>'action' = 'review_p2a_plan'
        AND metadata->>'plan_id' = NEW.handover_id::text
        AND metadata->>'approver_role' = ANY (v_cancelled_roles);
    END IF;
  END IF;

  -- (2) reset VCR point status back to DRAFT
  IF v_is_vcr THEN
    UPDATE public.p2a_handover_points
    SET execution_plan_status = 'DRAFT', updated_at = now()
    WHERE id = NEW.point_id;
  ELSE
    -- For P2A reject, reset plan status too (mirror ORA behavior)
    UPDATE public.p2a_handover_plans SET status = 'DRAFT' WHERE id = NEW.handover_id;
  END IF;

  -- (3) Revise task for Sr ORA Engr
  IF v_sr_engr IS NOT NULL AND v_proj_id IS NOT NULL THEN
    IF v_is_vcr THEN
      v_dedupe := 'revise_vcr_plan:'||NEW.point_id::text||':'||NEW.cycle::text;
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
      SELECT v_sr_engr,
        v_proj_code || ': Revise ' || v_vcr_code || ' Plan',
        'Address the rejection by ' || NEW.role_name || ' and resubmit the ' || v_vcr_code || ' execution plan',
        'task','pending','High', v_dedupe,
        jsonb_build_object(
          'source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', NEW.handover_id, 'point_id', NEW.point_id, 'vcr_code', v_vcr_code,
          'action','revise_vcr_plan',
          'rejected_by_role', NEW.role_name,
          'rejection_cycle', NEW.cycle,
          'rejection_comments', COALESCE(NEW.comments, ''))
      WHERE NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe);
    ELSE
      v_dedupe := 'revise_p2a_plan:'||NEW.handover_id::text||':'||NEW.cycle::text;
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
      SELECT v_sr_engr,
        v_proj_code || ': Revise P2A Plan',
        'Address the rejection by ' || NEW.role_name || ' and resubmit the P2A Plan',
        'task','pending','High', v_dedupe,
        jsonb_build_object(
          'source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', NEW.handover_id, 'action','revise_p2a_plan',
          'rejected_by_role', NEW.role_name,
          'rejection_cycle', NEW.cycle,
          'rejection_comments', COALESCE(NEW.comments, ''))
      WHERE NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;