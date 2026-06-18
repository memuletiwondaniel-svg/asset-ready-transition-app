
-- 1) Scope fingerprint
CREATE OR REPLACE FUNCTION public.vcr_scope_fingerprint(p_handover_point_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(
    'sys:'  || COALESCE((SELECT string_agg(ps.system_id::text, ',' ORDER BY ps.system_id)
                          FROM public.p2a_handover_point_systems ps
                          WHERE ps.handover_point_id = p_handover_point_id), '') ||
    '|whp:' || COALESCE((SELECT string_agg(i.id::text, ',' ORDER BY i.id)
                          FROM public.p2a_itp_activities i
                          WHERE i.handover_point_id = p_handover_point_id), '') ||
    '|trn:' || COALESCE((SELECT string_agg(t.id::text, ',' ORDER BY t.id)
                          FROM public.p2a_vcr_training t
                          WHERE t.handover_point_id = p_handover_point_id), '') ||
    '|prc:' || COALESCE((SELECT string_agg(pr.id::text, ',' ORDER BY pr.id)
                          FROM public.p2a_vcr_procedures pr
                          WHERE pr.handover_point_id = p_handover_point_id), '') ||
    '|mnt:' || COALESCE((SELECT string_agg(m.id::text, ',' ORDER BY m.id)
                          FROM public.p2a_vcr_maintenance_deliverables m
                          WHERE m.handover_point_id = p_handover_point_id
                            AND m.is_applicable = true), '') ||
    '|chk:' || COALESCE((SELECT string_agg(x::text, ',' ORDER BY x)
                          FROM unnest(public.vcr_active_item_ids(p_handover_point_id)) x), '')
  );
$$;
GRANT EXECUTE ON FUNCTION public.vcr_scope_fingerprint(uuid) TO authenticated, service_role;

-- 2) Extend snapshot payload with fingerprint + systems + witness_hold_points
CREATE OR REPLACE FUNCTION public._vcr_build_snapshot_payload(p_handover_point_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'scope_fingerprint', public.vcr_scope_fingerprint(p_handover_point_id),
    'active_vcr_item_ids', to_jsonb(public.vcr_active_item_ids(p_handover_point_id)),
    'items_by_category', '{}'::jsonb,
    'systems', COALESCE((
      SELECT jsonb_agg(ps.system_id ORDER BY ps.system_id)
      FROM public.p2a_handover_point_systems ps
      WHERE ps.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'witness_hold_points', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id)
      FROM public.p2a_itp_activities i
      WHERE i.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id)
      FROM public.p2a_vcr_critical_docs d
      WHERE d.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'training', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id)
      FROM public.p2a_vcr_training t
      WHERE t.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'procedures', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.id)
      FROM public.p2a_vcr_procedures pr
      WHERE pr.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'registers', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id)
      FROM public.p2a_vcr_register_selections r
      WHERE r.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'logsheets', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id)
      FROM public.p2a_vcr_logsheets l
      WHERE l.handover_point_id = p_handover_point_id), '[]'::jsonb),
    'maintenance', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id)
      FROM public.p2a_vcr_maintenance_deliverables m
      WHERE m.handover_point_id = p_handover_point_id
        AND m.is_applicable = true), '[]'::jsonb),
    'approvers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'role_label', a.role_label,
          'role_key', a.role_key,
          'user_id', a.user_id,
          'approver_order', a.approver_order
        ) ORDER BY a.approver_order
      )
      FROM public.vcr_plan_approvers a
      WHERE a.handover_point_id = p_handover_point_id), '[]'::jsonb)
  );
$$;

-- 3) submit_vcr_plan with scope-change detection
CREATE OR REPLACE FUNCTION public.submit_vcr_plan(p_handover_point_id uuid, p_approvers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_hc boolean := false; v_template_id uuid;
  v_active_count int := 0; v_items_upserted int := 0; v_items_deleted int := 0;
  v_approvers_upserted int := 0; v_rejected_reset int := 0;
  v_protected_items jsonb; v_protected_apvrs jsonb; v_incoming_users uuid[];
  v_prior_status public.vcr_plan_status;
  v_capture_submitter boolean := false;
  v_submitter_snapshot_id uuid;
  v_caller uuid := auth.uid();
  v_baseline_id uuid; v_baseline_payload jsonb;
  v_baseline_fp text; v_live_fp text;
  v_baseline_legacy_hash text; v_live_legacy_hash text;
  v_scope_changed boolean := false;
  v_scope_approvers_reset int := 0;
  HC_TEMPLATE constant uuid := '363a831c-edb3-4224-a97f-2e8b11fac2dc';
  NON_HC_TEMPLATE constant uuid := '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';
BEGIN
  IF p_handover_point_id IS NULL THEN RAISE EXCEPTION 'handover_point_id is required'; END IF;
  IF p_approvers IS NULL OR jsonb_typeof(p_approvers) <> 'array' THEN
    RAISE EXCEPTION 'p_approvers must be a JSON array'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_points WHERE id = p_handover_point_id) THEN
    RAISE EXCEPTION 'VCR % not found', p_handover_point_id; END IF;

  SELECT execution_plan_status INTO v_prior_status
    FROM public.p2a_handover_points WHERE id = p_handover_point_id;
  v_capture_submitter := v_prior_status IS NULL
    OR v_prior_status IN ('DRAFT'::vcr_plan_status, 'CHANGES_REQUESTED'::vcr_plan_status);

  -- ─── Scope-change detection vs active baseline ─────────────────────
  SELECT id, snapshot INTO v_baseline_id, v_baseline_payload
    FROM public.vcr_plan_snapshots
   WHERE handover_point_id = p_handover_point_id
     AND kind = 'baseline' AND voided_at IS NULL
   ORDER BY created_at DESC LIMIT 1;

  IF v_baseline_id IS NOT NULL THEN
    v_live_fp := public.vcr_scope_fingerprint(p_handover_point_id);
    v_baseline_fp := v_baseline_payload->>'scope_fingerprint';

    IF v_baseline_fp IS NOT NULL THEN
      v_scope_changed := (v_live_fp IS DISTINCT FROM v_baseline_fp);
    ELSE
      -- Legacy baselines: fall back to active_vcr_item_ids set comparison
      v_live_legacy_hash := md5(COALESCE(
        (SELECT string_agg(x::text, ',' ORDER BY x)
           FROM unnest(public.vcr_active_item_ids(p_handover_point_id)) x), ''));
      v_baseline_legacy_hash := md5(COALESCE(
        (SELECT string_agg((elem)::text, ',' ORDER BY (elem::uuid))
           FROM jsonb_array_elements_text(v_baseline_payload->'active_vcr_item_ids') AS elem), ''));
      v_scope_changed := (v_live_legacy_hash <> v_baseline_legacy_hash);
    END IF;

    IF v_scope_changed THEN
      UPDATE public.vcr_plan_snapshots SET voided_at = now() WHERE id = v_baseline_id;

      WITH r AS (
        UPDATE public.vcr_plan_approvers
           SET status = 'PENDING'::vcr_plan_approver_status,
               decided_at = NULL, comments = NULL, updated_at = now()
         WHERE handover_point_id = p_handover_point_id
           AND (status <> 'PENDING'::vcr_plan_approver_status
                OR decided_at IS NOT NULL OR comments IS NOT NULL)
         RETURNING 1)
      SELECT COUNT(*) INTO v_scope_approvers_reset FROM r;

      INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
      VALUES (p_handover_point_id, v_caller, 'SCOPE_VOIDED',
              jsonb_build_object('approvers_reset', v_scope_approvers_reset,
                                 'voided_baseline_id', v_baseline_id,
                                 'source', 'submit_vcr_plan'));
    END IF;
  END IF;

  SELECT bool_or(s.is_hydrocarbon) INTO v_has_hc
  FROM public.p2a_handover_point_systems ps
  JOIN public.p2a_systems s ON s.id = ps.system_id
  WHERE ps.handover_point_id = p_handover_point_id;
  v_template_id := CASE WHEN COALESCE(v_has_hc,false) THEN HC_TEMPLATE ELSE NON_HC_TEMPLATE END;

  CREATE TEMP TABLE _active_items ON COMMIT DROP AS
  SELECT vi.id AS vcr_item_id, vi.vcr_item AS summary, vi.display_order
  FROM public.vcr_template_items ti
  JOIN public.vcr_items vi ON vi.id = ti.vcr_item_id AND vi.is_active = true
  WHERE ti.template_id = v_template_id
    AND NOT EXISTS (SELECT 1 FROM public.p2a_vcr_item_overrides ov
      WHERE ov.handover_point_id = p_handover_point_id AND ov.vcr_item_id = vi.id AND ov.is_na = true);

  SELECT COUNT(*) INTO v_active_count FROM _active_items;
  IF v_active_count = 0 THEN
    RAISE EXCEPTION 'No active checklist items for this VCR (all items are N/A or template is empty)'
      USING ERRCODE = 'P0001'; END IF;

  SELECT jsonb_agg(jsonb_build_object('prerequisite_id', p.id, 'vcr_item_id', p.vcr_item_id,
           'summary', p.summary, 'decisions', d.decisions))
    INTO v_protected_items
  FROM public.p2a_vcr_prerequisites p
  JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('approver_user_id', a.approver_user_id,
             'status', a.status, 'decided_at', a.decided_at)) AS decisions
    FROM public.vcr_prerequisite_approvals a
    WHERE a.prerequisite_id = p.id AND a.status <> 'PENDING') d ON d.decisions IS NOT NULL
  WHERE p.handover_point_id = p_handover_point_id
    AND NOT EXISTS (SELECT 1 FROM _active_items ai WHERE ai.vcr_item_id = p.vcr_item_id);

  IF v_protected_items IS NOT NULL AND jsonb_array_length(v_protected_items) > 0 THEN
    RAISE EXCEPTION 'Cannot remove checklist items with recorded approval decisions: %', v_protected_items::text
      USING ERRCODE = 'P0001'; END IF;

  WITH ins AS (
    INSERT INTO public.p2a_vcr_prerequisites (handover_point_id, vcr_item_id, summary, status, delivering_party_id, display_order)
    SELECT p_handover_point_id, ai.vcr_item_id, COALESCE(NULLIF(ai.summary,''), 'VCR Item'),
           'NOT_STARTED'::p2a_vcr_prerequisite_status, NULL, COALESCE(ai.display_order, 0)
    FROM _active_items ai
    ON CONFLICT (handover_point_id, vcr_item_id) DO UPDATE SET
      summary = EXCLUDED.summary, display_order = EXCLUDED.display_order, updated_at = now()
    RETURNING 1)
  SELECT COUNT(*) INTO v_items_upserted FROM ins;

  WITH del AS (
    DELETE FROM public.p2a_vcr_prerequisites p
    WHERE p.handover_point_id = p_handover_point_id
      AND NOT EXISTS (SELECT 1 FROM _active_items ai WHERE ai.vcr_item_id = p.vcr_item_id)
    RETURNING 1)
  SELECT COUNT(*) INTO v_items_deleted FROM del;

  SELECT COALESCE(array_agg(DISTINCT (elem->>'user_id')::uuid), ARRAY[]::uuid[])
    INTO v_incoming_users
  FROM jsonb_array_elements(p_approvers) AS elem WHERE (elem->>'user_id') IS NOT NULL;

  SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'role_label', role_label, 'status', status))
    INTO v_protected_apvrs
  FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status = 'APPROVED' AND NOT (user_id = ANY(v_incoming_users));

  IF v_protected_apvrs IS NOT NULL AND jsonb_array_length(v_protected_apvrs) > 0 THEN
    RAISE EXCEPTION 'Cannot remove approvers with recorded APPROVED decisions: %', v_protected_apvrs::text
      USING ERRCODE = 'P0001'; END IF;

  DELETE FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status IN ('PENDING','REJECTED')
    AND NOT (user_id = ANY(v_incoming_users));

  WITH r AS (
    UPDATE public.vcr_plan_approvers
       SET status = 'PENDING'::vcr_plan_approver_status,
           decided_at = NULL, comments = NULL, updated_at = now()
     WHERE handover_point_id = p_handover_point_id
       AND status = 'REJECTED' AND user_id = ANY(v_incoming_users)
     RETURNING 1)
  SELECT COUNT(*) INTO v_rejected_reset FROM r;

  WITH upserted AS (
    INSERT INTO public.vcr_plan_approvers (handover_point_id, user_id, role_key, role_label, approver_order, status)
    SELECT p_handover_point_id, (elem->>'user_id')::uuid,
      COALESCE(NULLIF(elem->>'role_key',''), 'custom'),
      COALESCE(NULLIF(elem->>'role_label',''), 'Approver'),
      COALESCE((elem->>'approver_order')::int, 0),
      'PENDING'::vcr_plan_approver_status
    FROM jsonb_array_elements(p_approvers) AS elem
    WHERE (elem->>'user_id') IS NOT NULL
    ON CONFLICT (handover_point_id, user_id) DO UPDATE SET
      role_key = EXCLUDED.role_key, role_label = EXCLUDED.role_label,
      approver_order = EXCLUDED.approver_order, updated_at = now()
    RETURNING 1)
  SELECT COUNT(*) INTO v_approvers_upserted FROM upserted;

  UPDATE public.p2a_handover_points
     SET status = 'READY'::p2a_handover_point_status,
         execution_plan_status = CASE
           WHEN v_scope_changed THEN 'SUBMITTED'::vcr_plan_status
           WHEN execution_plan_status = 'APPROVED'::vcr_plan_status
                AND NOT EXISTS (SELECT 1 FROM public.vcr_plan_approvers
                                 WHERE handover_point_id = p_handover_point_id
                                   AND status <> 'APPROVED')
           THEN 'APPROVED'::vcr_plan_status
           ELSE 'SUBMITTED'::vcr_plan_status
         END,
         execution_plan_approved_at = CASE WHEN v_scope_changed THEN NULL ELSE execution_plan_approved_at END,
         execution_plan_approved_by = CASE WHEN v_scope_changed THEN NULL ELSE execution_plan_approved_by END,
         updated_at = now()
   WHERE id = p_handover_point_id;

  IF v_capture_submitter THEN
    UPDATE public.vcr_plan_snapshots
       SET voided_at = now()
     WHERE handover_point_id = p_handover_point_id
       AND kind = 'submitter' AND voided_at IS NULL;
    INSERT INTO public.vcr_plan_snapshots (handover_point_id, kind, snapshot, created_by)
    VALUES (p_handover_point_id, 'submitter',
            public._vcr_build_snapshot_payload(p_handover_point_id), v_caller)
    RETURNING id INTO v_submitter_snapshot_id;

    UPDATE public.user_tasks
       SET status = 'completed', updated_at = now(),
           progress_percentage = 100, confirmed_at = now(),
           confirmed_by_sr_ora_engr = true
     WHERE type = 'vcr_plan_resubmit'
       AND status <> 'completed'
       AND dedupe_key = 'vcr_plan_resubmit:' || p_handover_point_id::text;
  END IF;

  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (
    p_handover_point_id, v_caller,
    CASE WHEN v_capture_submitter THEN 'SUBMITTED' ELSE 'EDIT' END,
    jsonb_build_object(
      'active_count', v_active_count,
      'items_upserted', v_items_upserted,
      'items_deleted', v_items_deleted,
      'approvers_upserted', v_approvers_upserted,
      'prior_status', v_prior_status,
      'scope_changed', v_scope_changed
    )
  );

  RETURN jsonb_build_object(
    'handover_point_id', p_handover_point_id, 'status', 'READY',
    'template_id', v_template_id, 'active_count', v_active_count,
    'items_upserted', v_items_upserted, 'items_deleted', v_items_deleted,
    'approvers_upserted', v_approvers_upserted, 'rejected_reset', v_rejected_reset,
    'submitter_snapshot_captured', v_capture_submitter,
    'submitter_snapshot_id', v_submitter_snapshot_id,
    'scope_changed', v_scope_changed,
    'returned_to_phase1', v_scope_changed,
    'scope_approvers_reset', v_scope_approvers_reset);
END;
$function$;

-- 4) decide_vcr_plan_approval: align Phase-2 backstop to scope fingerprint + reset ALL approvers
CREATE OR REPLACE FUNCTION public.decide_vcr_plan_approval(p_approver_row_id uuid, p_decision text, p_comment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.vcr_plan_approvers%ROWTYPE;
  v_caller uuid := auth.uid();
  v_phase int; v_has_ora boolean; v_ora_status text;
  v_any_rejected boolean; v_total int; v_approved int;
  v_new_plan_status public.vcr_plan_status;
  v_baseline_id uuid; v_baseline_payload jsonb;
  v_live_fp text; v_baseline_fp text;
  v_live_legacy_hash text; v_baseline_legacy_hash text;
  v_scope_changed boolean := false;
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
  SELECT hp.vcr_code, hp.name, hp.handover_plan_id
    INTO v_vcr_code, v_vcr_name, v_plan_id
    FROM public.p2a_handover_points hp WHERE hp.id = v_row.handover_point_id;
  SELECT pl.project_id, pl.project_code
    INTO v_project_id, v_project_code
    FROM public.p2a_handover_plans pl WHERE pl.id = v_plan_id;

  -- ─── Phase-2 scope-change protection (fingerprint-based, full reset) ───
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

    v_baseline_fp := v_baseline_payload->>'scope_fingerprint';
    IF v_baseline_fp IS NOT NULL THEN
      v_live_fp := public.vcr_scope_fingerprint(v_row.handover_point_id);
      v_scope_changed := (v_live_fp IS DISTINCT FROM v_baseline_fp);
    ELSE
      v_live_legacy_hash := md5(COALESCE(
        (SELECT string_agg(x::text, ',' ORDER BY x)
           FROM unnest(public.vcr_active_item_ids(v_row.handover_point_id)) x), ''));
      v_baseline_legacy_hash := md5(COALESCE(
        (SELECT string_agg((elem)::text, ',' ORDER BY (elem::uuid))
           FROM jsonb_array_elements_text(v_baseline_payload->'active_vcr_item_ids') AS elem), ''));
      v_scope_changed := (v_live_legacy_hash <> v_baseline_legacy_hash);
    END IF;

    IF v_scope_changed THEN
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
                                 'voided_baseline_id', v_baseline_id,
                                 'source', 'decide_vcr_plan_approval'));

      RAISE EXCEPTION 'Plan scope changed since baseline — awaiting re-baseline by ORA Lead.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

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
        'High', 'pending',
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
