
-- 1) recall_vcr_plan RPC
CREATE OR REPLACE FUNCTION public.recall_vcr_plan(p_handover_point_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_submitter uuid;
  v_prior public.vcr_plan_status;
  v_approved_count int := 0;
  v_any_rejected boolean := false;
  v_total int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'handover_point_id is required';
  END IF;

  -- Authorize: caller must be the submitter
  v_submitter := public._vcr_plan_submitter(p_handover_point_id);
  IF v_submitter IS NULL OR v_submitter <> v_caller THEN
    RAISE EXCEPTION 'forbidden: only the submitter may recall' USING ERRCODE = '42501';
  END IF;

  -- Lock handover point and load status
  SELECT execution_plan_status INTO v_prior
    FROM public.p2a_handover_points
   WHERE id = p_handover_point_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VCR % not found', p_handover_point_id;
  END IF;

  IF v_prior IS NULL OR v_prior = 'DRAFT'::vcr_plan_status THEN
    RAISE EXCEPTION 'nothing to recall' USING ERRCODE = 'P0001';
  ELSIF v_prior = 'APPROVED'::vcr_plan_status THEN
    RAISE EXCEPTION 'plan already approved' USING ERRCODE = 'P0001';
  ELSIF v_prior = 'CHANGES_REQUESTED'::vcr_plan_status THEN
    RAISE EXCEPTION 'plan has requested changes — use resubmit' USING ERRCODE = 'P0001';
  ELSIF v_prior <> 'SUBMITTED'::vcr_plan_status THEN
    RAISE EXCEPTION 'plan not in a recallable state (current: %)', v_prior USING ERRCODE = 'P0001';
  END IF;

  -- Approval guard: no approver may have acted
  SELECT
    COUNT(*) FILTER (WHERE status = 'APPROVED'::vcr_plan_approver_status),
    bool_or(status = 'REJECTED'::vcr_plan_approver_status),
    COUNT(*)
    INTO v_approved_count, v_any_rejected, v_total
  FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id;

  IF v_approved_count > 0 OR COALESCE(v_any_rejected, false) THEN
    RAISE EXCEPTION 'Cannot recall: an approver has already acted. Request changes and resubmit, or change scope to void approvals.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Effect: flip plan back to DRAFT (preserve approver roster as PENDING)
  UPDATE public.p2a_handover_points
     SET execution_plan_status = 'DRAFT'::vcr_plan_status,
         updated_at = now()
   WHERE id = p_handover_point_id;

  -- Reopen submitter's plan-building user_task(s) if completed
  UPDATE public.user_tasks
     SET status = 'in_progress',
         confirmed_at = NULL,
         confirmed_by_sr_ora_engr = false,
         updated_at = now()
   WHERE type = 'vcr_delivery_plan'
     AND status = 'completed'
     AND (metadata->>'vcr_id') = p_handover_point_id::text;

  -- Reopen linked ora_plan_activities row(s)
  UPDATE public.ora_plan_activities
     SET status = 'IN_PROGRESS',
         updated_at = now()
   WHERE source_type = 'vcr_delivery_plan'
     AND source_ref_id = p_handover_point_id
     AND status = 'COMPLETED';

  -- Event
  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (p_handover_point_id, v_caller, 'RECALLED',
          jsonb_build_object('prior_status', v_prior,
                             'approvers_preserved', v_total));

  RETURN jsonb_build_object(
    'recalled', true,
    'handover_point_id', p_handover_point_id,
    'prior_status', v_prior,
    'approvers_preserved', v_total
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.recall_vcr_plan(uuid) TO authenticated;

-- 2) View gate: actionability requires execution_plan_status = 'SUBMITTED'
CREATE OR REPLACE VIEW public.v_vcr_plan_approver_tasks AS
WITH plan AS (
  SELECT a_1.handover_point_id,
    count(*) AS total_count,
    count(*) FILTER (WHERE a_1.status = 'APPROVED'::vcr_plan_approver_status) AS approved_count,
    bool_or(a_1.status = 'REJECTED'::vcr_plan_approver_status) AS any_rejected,
    bool_or(a_1.role_key = 'ora_lead'::text) AS has_ora_lead,
    max(a_1.status::text) FILTER (WHERE a_1.role_key = 'ora_lead'::text) AS ora_status,
    max(a_1.decided_at) FILTER (WHERE a_1.role_key = 'ora_lead'::text AND a_1.status = 'APPROVED'::vcr_plan_approver_status) AS ora_approved_at,
    ( SELECT jsonb_agg(jsonb_build_object('role_label', x.role_label, 'user_id', x.user_id))
        FROM vcr_plan_approvers x
       WHERE x.handover_point_id = a_1.handover_point_id
         AND x.status = 'REJECTED'::vcr_plan_approver_status) AS rejectors
  FROM vcr_plan_approvers a_1
  GROUP BY a_1.handover_point_id
), phase_calc AS (
  SELECT p.handover_point_id, p.total_count, p.approved_count, p.any_rejected,
    p.has_ora_lead, p.ora_status, p.ora_approved_at, p.rejectors,
    CASE
      WHEN NOT p.has_ora_lead THEN NULL::integer
      WHEN p.any_rejected THEN NULL::integer
      WHEN p.approved_count = p.total_count THEN NULL::integer
      WHEN p.ora_status = 'PENDING'::text THEN 1
      WHEN p.ora_status = 'APPROVED'::text THEN 2
      ELSE NULL::integer
    END AS phase
  FROM plan p
)
SELECT a.id AS approver_row_id,
  a.handover_point_id,
  hp.vcr_code,
  hp.name AS vcr_name,
  hpl.project_id,
  (pr.project_id_prefix || '-'::text) || pr.project_id_number AS project_code,
  a.user_id,
  a.role_key,
  a.role_label,
  a.approver_order,
  a.status AS row_status,
  a.decided_at,
  a.comments,
  pc.phase,
  pc.total_count,
  pc.approved_count,
  pc.any_rejected,
  pc.has_ora_lead,
  pc.rejectors,
  hp.execution_plan_status,
  CASE
    WHEN hp.execution_plan_status <> 'SUBMITTED'::vcr_plan_status THEN false
    WHEN NOT pc.has_ora_lead THEN false
    WHEN pc.any_rejected THEN false
    WHEN a.status <> 'PENDING'::vcr_plan_approver_status THEN false
    WHEN pc.phase = 1 AND a.role_key = 'ora_lead'::text THEN true
    WHEN pc.phase = 2 AND a.role_key <> 'ora_lead'::text THEN true
    ELSE false
  END AS is_actionable,
  CASE
    WHEN a.role_key <> 'ora_lead'::text AND pc.ora_approved_at IS NOT NULL THEN pc.ora_approved_at
    ELSE a.created_at
  END AS task_created_at,
  a.review_started_at,
  a.review_max_step
FROM vcr_plan_approvers a
  JOIN p2a_handover_points hp ON hp.id = a.handover_point_id
  LEFT JOIN p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
  LEFT JOIN projects pr ON pr.id = hpl.project_id
  LEFT JOIN phase_calc pc ON pc.handover_point_id = a.handover_point_id;
