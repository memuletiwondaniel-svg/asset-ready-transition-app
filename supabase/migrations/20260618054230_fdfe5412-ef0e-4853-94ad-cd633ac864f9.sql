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
           progress_percentage = 100, confirmed_at = now(),
           confirmed_by_sr_ora_engr = true
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