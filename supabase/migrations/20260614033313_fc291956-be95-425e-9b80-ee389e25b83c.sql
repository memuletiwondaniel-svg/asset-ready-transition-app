CREATE OR REPLACE FUNCTION public.decide_vcr_plan_approval(
  p_approver_row_id uuid, p_decision text, p_comment text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.vcr_plan_approvers%ROWTYPE;
  v_caller uuid := auth.uid();
  v_phase int; v_has_ora boolean; v_ora_status text;
  v_any_rejected boolean; v_total int; v_approved int;
  v_new_plan_status public.vcr_plan_status;
  v_baseline_id uuid; v_baseline_payload jsonb;
  v_live_active uuid[]; v_live_hash text; v_baseline_hash text;
  v_reset_count int := 0; v_baseline_snapshot_id uuid;
  v_submitter uuid; v_vcr_code text; v_vcr_name text;
  v_plan_id uuid; v_project_id uuid; v_project_code text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000'; END IF;
  IF p_decision NOT IN ('APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'p_decision must be APPROVED or REJECTED'; END IF;

  SELECT * INTO v_row FROM public.vcr_plan_approvers WHERE id = p_approver_row_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'approver row % not found', p_approver_row_id; END IF;
  IF v_row.user_id <> v_caller THEN
    RAISE EXCEPTION 'forbidden: caller is not this approver' USING ERRCODE='42501'; END IF;
  IF v_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'approver row is not PENDING (current: %)', v_row.status; END IF;

  SELECT bool_or(role_key='ora_lead'),
         max(status::text) FILTER (WHERE role_key='ora_lead'),
         bool_or(status='REJECTED')
    INTO v_has_ora, v_ora_status, v_any_rejected
   FROM public.vcr_plan_approvers WHERE handover_point_id = v_row.handover_point_id;

  IF NOT v_has_ora THEN RAISE EXCEPTION 'plan misconfigured: no ORA Lead approver row'; END IF;
  IF v_any_rejected THEN RAISE EXCEPTION 'plan in CHANGES_REQUESTED state; awaiting re-submit'; END IF;
  v_phase := CASE WHEN v_ora_status='PENDING' THEN 1 WHEN v_ora_status='APPROVED' THEN 2 END;

  IF v_phase = 1 AND v_row.role_key <> 'ora_lead' THEN
    RAISE EXCEPTION 'out-of-phase: Phase 1 — only ORA Lead may decide' USING ERRCODE='42501'; END IF;
  IF v_phase = 2 AND v_row.role_key = 'ora_lead' THEN
    RAISE EXCEPTION 'out-of-phase: ORA Lead already decided' USING ERRCODE='42501'; END IF;

  v_submitter := public._vcr_plan_submitter(v_row.handover_point_id);
  SELECT hp.vcr_code, hp.vcr_name, hp.handover_plan_id
    INTO v_vcr_code, v_vcr_name, v_plan_id
    FROM public.p2a_handover_points hp WHERE hp.id = v_row.handover_point_id;
  SELECT pl.project_id, pl.project_code
    INTO v_project_id, v_project_code
    FROM public.p2a_handover_plans pl WHERE pl.id = v_plan_id;

  -- ─── Phase-2 scope-change protection ────────────────────────────
  IF v_phase = 2 THEN
    SELECT id, snapshot INTO v_baseline_id, v_baseline_payload
      FROM public.vcr_plan_snapshots
     WHERE handover_point_id = v_row.handover_point_id
       AND kind = 'baseline' AND voided_at IS NULL
     ORDER BY created_at DESC LIMIT 1;

    IF v_baseline_id IS NULL THEN
      RAISE EXCEPTION 'Plan has no active baseline snapshot — awaiting re-baseline by ORA Lead.'
        USING ERRCODE = 'P0001';
    END IF;

    v_live_active := public.vcr_active_item_ids(v_row.handover_point_id);
    v_live_hash := md5(COALESCE(
      (SELECT string_agg(x::text, ',' ORDER BY x) FROM unnest(v_live_active) x), ''));
    v_baseline_hash := md5(COALESCE(
      (SELECT string_agg((elem)::text, ',' ORDER BY (elem::uuid))
       FROM jsonb_array_elements_text(v_baseline_payload->'active_vcr_item_ids') AS elem), ''));

    IF v_live_hash <> v_baseline_hash THEN
      UPDATE public.vcr_plan_snapshots SET voided_at = now() WHERE id = v_baseline_id;

      WITH r AS (
        UPDATE public.vcr_plan_approvers
           SET status = 'PENDING'::vcr_plan_approver_status,
               decided_at = NULL, comments = NULL, updated_at = now()
         WHERE handover_point_id = v_row.handover_point_id
           AND (status <> 'PENDING'::vcr_plan_approver_status
                OR decided_at IS NOT NULL OR comments IS NOT NULL)
         RETURNING 1)
      SELECT COUNT(*) INTO v_reset_count FROM r;

      UPDATE public.p2a_handover_points
         SET execution_plan_status = 'SUBMITTED'::vcr_plan_status,
             execution_plan_approved_at = NULL,
             execution_plan_approved_by = NULL,
             updated_at = now()
       WHERE id = v_row.handover_point_id;

      INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
      VALUES (v_row.handover_point_id, v_caller, 'SCOPE_VOIDED',
              jsonb_build_object('approvers_reset', v_reset_count,
                                 'voided_baseline_id', v_baseline_id));

      RETURN jsonb_build_object(
        'scope_changed', true, 'baseline_voided', true,
        'approvers_reset', v_reset_count, 'plan_status', 'SUBMITTED',
        'handover_point_id', v_row.handover_point_id,
        'message', 'Plan scope changed since baseline; approvals reset for ORA re-review.'
      );
    END IF;
  END IF;

  -- ─── Record the decision ──────────────────────────────────────────
  UPDATE public.vcr_plan_approvers
     SET status = p_decision::vcr_plan_approver_status,
         decided_at = now(), comments = p_comment, updated_at = now()
   WHERE id = p_approver_row_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='APPROVED'), bool_or(status='REJECTED')
    INTO v_total, v_approved, v_any_rejected
   FROM public.vcr_plan_approvers WHERE handover_point_id = v_row.handover_point_id;

  v_new_plan_status := CASE
    WHEN v_any_rejected THEN 'CHANGES_REQUESTED'::vcr_plan_status
    WHEN v_approved = v_total THEN 'APPROVED'::vcr_plan_status
    ELSE 'SUBMITTED'::vcr_plan_status END;

  UPDATE public.p2a_handover_points
     SET execution_plan_status = v_new_plan_status,
         execution_plan_approved_at = CASE WHEN v_new_plan_status='APPROVED' THEN now() ELSE execution_plan_approved_at END,
         execution_plan_approved_by = CASE WHEN v_new_plan_status='APPROVED' THEN v_caller ELSE execution_plan_approved_by END,
         updated_at = now()
   WHERE id = v_row.handover_point_id;

  IF v_phase = 1 AND p_decision = 'APPROVED' THEN
    v_baseline_snapshot_id := public.snapshot_vcr_plan_baseline(v_row.handover_point_id);
  END IF;

  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (
    v_row.handover_point_id, v_caller, p_decision,
    jsonb_build_object('phase', v_phase, 'role_key', v_row.role_key,
                       'role_label', v_row.role_label, 'comment', p_comment,
                       'plan_status', v_new_plan_status)
  );

  IF v_submitter IS NOT NULL AND v_submitter <> v_caller THEN
    IF v_phase = 1 AND p_decision = 'APPROVED' THEN
      PERFORM public._vcr_notify(
        v_submitter, v_caller,
        'vcr_plan_phase1_approved',
        'ORA Lead approved your VCR plan' || COALESCE(' ('||v_vcr_code||')',''),
        COALESCE(p_comment, 'Your plan was approved by the ORA Lead and sent to Phase-2 approvers.'));
    ELSIF p_decision = 'REJECTED' THEN
      PERFORM public._vcr_notify(
        v_submitter, v_caller,
        'vcr_plan_changes_requested',
        'Changes requested on your VCR plan' || COALESCE(' ('||v_vcr_code||')',''),
        COALESCE(p_comment, 'A reviewer requested changes. Please review and resubmit.'));
    ELSIF v_new_plan_status = 'APPROVED' THEN
      PERFORM public._vcr_notify(
        v_submitter, v_caller,
        'vcr_plan_approved',
        'Your VCR plan is fully approved' || COALESCE(' ('||v_vcr_code||')',''),
        'All approvers have signed off. The plan is now APPROVED.');
    END IF;

    IF p_decision = 'REJECTED' THEN
      INSERT INTO public.user_tasks
        (user_id, type, title, description, priority, status,
         dedupe_key, source_plan_table, source_plan_id, metadata)
      SELECT
        v_submitter, 'vcr_plan_resubmit',
        'Resubmit VCR plan' || COALESCE(' ('||v_vcr_code||')',''),
        COALESCE(p_comment, 'A reviewer requested changes. Update the plan and resubmit.'),
        'high', 'pending',
        'vcr_plan_resubmit:' || v_row.handover_point_id::text,
        'p2a_handover_points', v_row.handover_point_id,
        jsonb_build_object(
          'action', 'create_vcr_delivery_plan',
          'vcr_id', v_row.handover_point_id,
          'vcr_code', v_vcr_code,
          'vcr_name', v_vcr_name,
          'plan_id', v_plan_id,
          'project_id', v_project_id,
          'project_code', v_project_code,
          'rejected_by', v_caller,
          'rejected_by_role', v_row.role_label,
          'reason', p_comment)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_tasks
         WHERE type = 'vcr_plan_resubmit'
           AND dedupe_key = 'vcr_plan_resubmit:' || v_row.handover_point_id::text
           AND status <> 'completed'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'scope_changed', false,
    'approver_row_id', p_approver_row_id,
    'decision', p_decision,
    'phase', v_phase,
    'plan_status', v_new_plan_status,
    'baseline_snapshot_id', v_baseline_snapshot_id
  );
END;
$function$;