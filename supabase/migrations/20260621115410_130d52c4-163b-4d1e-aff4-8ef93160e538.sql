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
  v_total int := 0;
  v_voided int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'handover_point_id is required';
  END IF;

  v_submitter := public._vcr_plan_submitter(p_handover_point_id);
  IF v_submitter IS NULL OR v_submitter <> v_caller THEN
    RAISE EXCEPTION 'forbidden: only the submitter may recall' USING ERRCODE = '42501';
  END IF;

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

  -- Void any approver decisions: reset all rows for this VCR to PENDING.
  WITH reset AS (
    UPDATE public.vcr_plan_approvers
       SET status = 'PENDING'::vcr_plan_approver_status,
           decided_at = NULL,
           comments = NULL,
           updated_at = now()
     WHERE handover_point_id = p_handover_point_id
       AND (status <> 'PENDING'::vcr_plan_approver_status
            OR decided_at IS NOT NULL
            OR comments IS NOT NULL)
    RETURNING 1
  )
  SELECT count(*) INTO v_voided FROM reset;

  SELECT count(*) INTO v_total
    FROM public.vcr_plan_approvers
   WHERE handover_point_id = p_handover_point_id;

  -- Flip plan back to DRAFT
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

  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (p_handover_point_id, v_caller, 'RECALLED',
          jsonb_build_object('prior_status', v_prior,
                             'approvers_preserved', v_total,
                             'approvers_voided', v_voided));

  RETURN jsonb_build_object(
    'recalled', true,
    'handover_point_id', p_handover_point_id,
    'prior_status', v_prior,
    'approvers_preserved', v_total,
    'approvers_voided', v_voided
  );
END;
$function$;