-- ============================================================
-- Step 5a/b/c/d — submitter feedback, resubmit task, audit
-- ============================================================

-- 5c — Audit table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vcr_plan_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('SUBMITTED','EDIT','APPROVED','REJECTED','BASELINED','SCOPE_VOIDED')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vpae_hp_created
  ON public.vcr_plan_approval_events (handover_point_id, created_at DESC);

GRANT SELECT ON public.vcr_plan_approval_events TO authenticated;
GRANT ALL    ON public.vcr_plan_approval_events TO service_role;

ALTER TABLE public.vcr_plan_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vpae_read ON public.vcr_plan_approval_events;
CREATE POLICY vpae_read ON public.vcr_plan_approval_events
FOR SELECT TO authenticated
USING (
  actor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.vcr_plan_approvers a
             WHERE a.handover_point_id = vcr_plan_approval_events.handover_point_id
               AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1
             FROM public.p2a_handover_points hp
             JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
             JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
             WHERE hp.id = vcr_plan_approval_events.handover_point_id
               AND ptm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.p2a_handover_points hp
             WHERE hp.id = vcr_plan_approval_events.handover_point_id
               AND hp.created_by = auth.uid())
);
-- No INSERT/UPDATE/DELETE policy: writes are RPC-only (SECURITY DEFINER).


-- Helper: resolve the submitter of a given plan ------------------
CREATE OR REPLACE FUNCTION public._vcr_plan_submitter(p_handover_point_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT created_by FROM public.vcr_plan_snapshots
      WHERE handover_point_id = p_handover_point_id
        AND kind = 'submitter' AND voided_at IS NULL
      ORDER BY created_at DESC LIMIT 1),
    (SELECT created_by FROM public.p2a_handover_points
      WHERE id = p_handover_point_id)
  );
$$;
REVOKE ALL ON FUNCTION public._vcr_plan_submitter(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._vcr_plan_submitter(uuid) TO authenticated, service_role;


-- Helper: send a VCR plan notification to a recipient ------------
CREATE OR REPLACE FUNCTION public._vcr_notify(
  p_recipient uuid, p_sender uuid, p_type text, p_title text, p_body text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  IF p_recipient IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE user_id = p_recipient LIMIT 1;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_recipient;
  END IF;
  IF v_email IS NULL THEN RETURN; END IF;  -- can't satisfy NOT NULL recipient_email
  INSERT INTO public.notifications
    (recipient_user_id, recipient_email, sender_user_id, type, title, content, status)
  VALUES
    (p_recipient, v_email, p_sender, p_type, p_title, p_body, 'PENDING');
END;
$$;
REVOKE ALL ON FUNCTION public._vcr_notify(uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._vcr_notify(uuid,uuid,text,text,text) TO authenticated, service_role;


-- ===== snapshot_vcr_plan_baseline — log BASELINED ==============
CREATE OR REPLACE FUNCTION public.snapshot_vcr_plan_baseline(p_handover_point_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_payload jsonb;
BEGIN
  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'p_handover_point_id is required'; END IF;
  v_payload := public._vcr_build_snapshot_payload(p_handover_point_id);
  UPDATE public.vcr_plan_snapshots
     SET voided_at = now()
   WHERE handover_point_id = p_handover_point_id
     AND kind = 'baseline'
     AND voided_at IS NULL;
  INSERT INTO public.vcr_plan_snapshots (handover_point_id, kind, snapshot, created_by)
  VALUES (p_handover_point_id, 'baseline', v_payload, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (p_handover_point_id, auth.uid(), 'BASELINED', jsonb_build_object('snapshot_id', v_id));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.snapshot_vcr_plan_baseline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.snapshot_vcr_plan_baseline(uuid) TO authenticated, service_role;


-- ===== submit_vcr_plan — audit + auto-clear resubmit task =======
CREATE OR REPLACE FUNCTION public.submit_vcr_plan(p_handover_point_id uuid, p_approvers jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
           WHEN execution_plan_status = 'APPROVED'::vcr_plan_status
                AND NOT EXISTS (SELECT 1 FROM public.vcr_plan_approvers
                                 WHERE handover_point_id = p_handover_point_id
                                   AND status <> 'APPROVED')
           THEN 'APPROVED'::vcr_plan_status
           ELSE 'SUBMITTED'::vcr_plan_status
         END,
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

    -- Clear any outstanding resubmit task: this submission satisfies it.
    UPDATE public.user_tasks
       SET status = 'completed', updated_at = now(),
           progress_percentage = 100, confirmed_at = now()
     WHERE type = 'vcr_plan_resubmit'
       AND status <> 'completed'
       AND dedupe_key = 'vcr_plan_resubmit:' || p_handover_point_id::text;
  END IF;

  -- 5c — audit
  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (
    p_handover_point_id, v_caller,
    CASE WHEN v_capture_submitter THEN 'SUBMITTED' ELSE 'EDIT' END,
    jsonb_build_object(
      'active_count', v_active_count,
      'items_upserted', v_items_upserted,
      'items_deleted', v_items_deleted,
      'approvers_upserted', v_approvers_upserted,
      'prior_status', v_prior_status
    )
  );

  RETURN jsonb_build_object(
    'handover_point_id', p_handover_point_id, 'status', 'READY',
    'template_id', v_template_id, 'active_count', v_active_count,
    'items_upserted', v_items_upserted, 'items_deleted', v_items_deleted,
    'approvers_upserted', v_approvers_upserted, 'rejected_reset', v_rejected_reset,
    'submitter_snapshot_captured', v_capture_submitter,
    'submitter_snapshot_id', v_submitter_snapshot_id);
END;
$function$;


-- ===== decide_vcr_plan_approval — audit + notify + resubmit task ==
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
  v_submitter uuid; v_vcr_code text;
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
  SELECT vcr_code INTO v_vcr_code FROM public.p2a_handover_points WHERE id = v_row.handover_point_id;

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

  -- Phase-1 baseline capture
  IF v_phase = 1 AND p_decision = 'APPROVED' THEN
    v_baseline_snapshot_id := public.snapshot_vcr_plan_baseline(v_row.handover_point_id);
  END IF;

  -- 5c audit
  INSERT INTO public.vcr_plan_approval_events (handover_point_id, actor_id, event_type, payload)
  VALUES (
    v_row.handover_point_id, v_caller, p_decision,
    jsonb_build_object('phase', v_phase, 'role_key', v_row.role_key,
                       'role_label', v_row.role_label, 'comment', p_comment,
                       'plan_status', v_new_plan_status)
  );

  -- 5a notifications + 5b resubmit task
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

    -- 5b — resubmit task on CHANGES_REQUESTED (dedupe so reject can't double)
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
          'vcr_id', v_row.handover_point_id,
          'vcr_code', v_vcr_code,
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