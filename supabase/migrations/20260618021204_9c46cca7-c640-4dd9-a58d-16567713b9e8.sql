
CREATE OR REPLACE FUNCTION public.withdraw_vcr_plan_approval(
  p_approver_row_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.vcr_plan_approvers%ROWTYPE;
  v_caller uuid := auth.uid();
  v_ora_status text;
  v_phase int;
  v_total int; v_approved int; v_any_rejected boolean;
  v_new_plan_status public.vcr_plan_status;
  v_baseline_id uuid;
  v_reset_count int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'p_reason is required (min 5 characters)';
  END IF;

  SELECT * INTO v_row
    FROM public.vcr_plan_approvers
   WHERE id = p_approver_row_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approver row % not found', p_approver_row_id;
  END IF;
  IF v_row.user_id <> v_caller THEN
    RAISE EXCEPTION 'forbidden: caller is not this approver' USING ERRCODE='42501';
  END IF;
  IF v_row.status NOT IN ('APPROVED'::vcr_plan_approver_status, 'REJECTED'::vcr_plan_approver_status) THEN
    RAISE EXCEPTION 'nothing to withdraw (current status: %)', v_row.status;
  END IF;

  -- Derive phase from ORA-lead row's current status (same as forward RPC).
  SELECT max(status::text) FILTER (WHERE role_key='ora_lead')
    INTO v_ora_status
   FROM public.vcr_plan_approvers
   WHERE handover_point_id = v_row.handover_point_id;

  v_phase := CASE
    WHEN v_ora_status = 'PENDING'  THEN 1
    WHEN v_ora_status = 'APPROVED' THEN 2
    ELSE NULL
  END;

  -- ── CASE B: Phase-1 ORA-Lead withdraw of an APPROVED decision → cascade ──
  IF v_row.role_key = 'ora_lead' AND v_row.status = 'APPROVED'::vcr_plan_approver_status THEN

    SELECT id INTO v_baseline_id
      FROM public.vcr_plan_snapshots
     WHERE handover_point_id = v_row.handover_point_id
       AND kind = 'baseline'
       AND voided_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_baseline_id IS NOT NULL THEN
      UPDATE public.vcr_plan_snapshots
         SET voided_at = now()
       WHERE id = v_baseline_id;
    END IF;

    WITH r AS (
      UPDATE public.vcr_plan_approvers
         SET status = 'PENDING'::vcr_plan_approver_status,
             decided_at = NULL,
             comments = NULL,
             updated_at = now()
       WHERE handover_point_id = v_row.handover_point_id
         AND (status <> 'PENDING'::vcr_plan_approver_status
              OR decided_at IS NOT NULL
              OR comments IS NOT NULL)
       RETURNING 1
    )
    SELECT COUNT(*) INTO v_reset_count FROM r;

    UPDATE public.p2a_handover_points
       SET execution_plan_status = 'SUBMITTED'::vcr_plan_status,
           execution_plan_approved_at = NULL,
           execution_plan_approved_by = NULL,
           updated_at = now()
     WHERE id = v_row.handover_point_id;

    INSERT INTO public.vcr_plan_approval_events
      (handover_point_id, actor_id, event_type, payload)
    VALUES (
      v_row.handover_point_id, v_caller, 'WITHDRAWN',
      jsonb_build_object(
        'phase', 1,
        'role_key', v_row.role_key,
        'role_label', v_row.role_label,
        'reason', p_reason,
        'scope', 'cascade_phase1',
        'approvers_reset', v_reset_count,
        'voided_baseline_id', v_baseline_id
      )
    );

    RETURN jsonb_build_object(
      'withdrawn', true,
      'scope', 'phase1_cascade',
      'approvers_reset', v_reset_count,
      'plan_status', 'SUBMITTED',
      'baseline_voided', v_baseline_id IS NOT NULL,
      'voided_baseline_id', v_baseline_id,
      'approver_row_id', p_approver_row_id
    );
  END IF;

  -- ── CASE A: self-only withdraw (Phase-2 approver, or Phase-1 ORA-Lead REJECTED) ──
  UPDATE public.vcr_plan_approvers
     SET status = 'PENDING'::vcr_plan_approver_status,
         decided_at = NULL,
         comments = NULL,
         updated_at = now()
   WHERE id = p_approver_row_id;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status='APPROVED'::vcr_plan_approver_status),
         bool_or(status='REJECTED'::vcr_plan_approver_status)
    INTO v_total, v_approved, v_any_rejected
   FROM public.vcr_plan_approvers
   WHERE handover_point_id = v_row.handover_point_id;

  v_new_plan_status := CASE
    WHEN v_any_rejected THEN 'CHANGES_REQUESTED'::vcr_plan_status
    WHEN v_approved = v_total THEN 'APPROVED'::vcr_plan_status
    ELSE 'SUBMITTED'::vcr_plan_status
  END;

  UPDATE public.p2a_handover_points
     SET execution_plan_status = v_new_plan_status,
         execution_plan_approved_at = CASE
           WHEN v_new_plan_status = 'APPROVED'::vcr_plan_status
             THEN execution_plan_approved_at
           ELSE NULL
         END,
         execution_plan_approved_by = CASE
           WHEN v_new_plan_status = 'APPROVED'::vcr_plan_status
             THEN execution_plan_approved_by
           ELSE NULL
         END,
         updated_at = now()
   WHERE id = v_row.handover_point_id;

  INSERT INTO public.vcr_plan_approval_events
    (handover_point_id, actor_id, event_type, payload)
  VALUES (
    v_row.handover_point_id, v_caller, 'WITHDRAWN',
    jsonb_build_object(
      'phase', v_phase,
      'role_key', v_row.role_key,
      'role_label', v_row.role_label,
      'reason', p_reason,
      'scope', 'self_only',
      'plan_status', v_new_plan_status
    )
  );

  RETURN jsonb_build_object(
    'withdrawn', true,
    'scope', CASE WHEN v_phase = 1 THEN 'phase1_self' ELSE 'phase2_self' END,
    'plan_status', v_new_plan_status,
    'approver_row_id', p_approver_row_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.withdraw_vcr_plan_approval(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_vcr_plan_approval(uuid, text) TO authenticated;
