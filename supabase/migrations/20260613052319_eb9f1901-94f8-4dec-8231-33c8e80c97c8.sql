
CREATE TYPE public.vcr_plan_status AS ENUM ('DRAFT','SUBMITTED','CHANGES_REQUESTED','APPROVED');

ALTER TABLE public.p2a_handover_points
  ALTER COLUMN execution_plan_status DROP DEFAULT,
  ALTER COLUMN execution_plan_status TYPE public.vcr_plan_status
    USING execution_plan_status::public.vcr_plan_status,
  ALTER COLUMN execution_plan_status SET DEFAULT 'DRAFT'::public.vcr_plan_status;

CREATE OR REPLACE VIEW public.v_vcr_plan_approver_tasks
WITH (security_invoker = true) AS
WITH plan AS (
  SELECT
    a.handover_point_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.status='APPROVED') AS approved_count,
    bool_or(a.status='REJECTED') AS any_rejected,
    bool_or(a.role_key='ora_lead') AS has_ora_lead,
    max(a.status::text) FILTER (WHERE a.role_key='ora_lead') AS ora_status,
    (SELECT jsonb_agg(jsonb_build_object('role_label', x.role_label, 'user_id', x.user_id))
       FROM public.vcr_plan_approvers x
      WHERE x.handover_point_id = a.handover_point_id AND x.status='REJECTED') AS rejectors
  FROM public.vcr_plan_approvers a
  GROUP BY a.handover_point_id
),
phase_calc AS (
  SELECT p.*,
    CASE
      WHEN NOT p.has_ora_lead THEN NULL::int
      WHEN p.any_rejected THEN NULL::int
      WHEN p.approved_count = p.total_count THEN NULL::int
      WHEN p.ora_status='PENDING' THEN 1
      WHEN p.ora_status='APPROVED' THEN 2
      ELSE NULL::int
    END AS phase
  FROM plan p
)
SELECT
  a.id AS approver_row_id,
  a.handover_point_id,
  hp.vcr_code,
  hpl.project_id,
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
    WHEN NOT pc.has_ora_lead THEN false
    WHEN pc.any_rejected THEN false
    WHEN a.status <> 'PENDING' THEN false
    WHEN pc.phase = 1 AND a.role_key = 'ora_lead' THEN true
    WHEN pc.phase = 2 AND a.role_key <> 'ora_lead' THEN true
    ELSE false
  END AS is_actionable
FROM public.vcr_plan_approvers a
JOIN public.p2a_handover_points hp ON hp.id = a.handover_point_id
LEFT JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
LEFT JOIN phase_calc pc ON pc.handover_point_id = a.handover_point_id;

GRANT SELECT ON public.v_vcr_plan_approver_tasks TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.submit_vcr_plan(p_handover_point_id uuid, p_approvers jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_has_hc boolean := false; v_template_id uuid;
  v_active_count int := 0; v_items_upserted int := 0; v_items_deleted int := 0;
  v_approvers_upserted int := 0; v_rejected_reset int := 0;
  v_protected_items jsonb; v_protected_apvrs jsonb; v_incoming_users uuid[];
  HC_TEMPLATE constant uuid := '363a831c-edb3-4224-a97f-2e8b11fac2dc';
  NON_HC_TEMPLATE constant uuid := '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';
BEGIN
  IF p_handover_point_id IS NULL THEN RAISE EXCEPTION 'handover_point_id is required'; END IF;
  IF p_approvers IS NULL OR jsonb_typeof(p_approvers) <> 'array' THEN
    RAISE EXCEPTION 'p_approvers must be a JSON array'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_points WHERE id = p_handover_point_id) THEN
    RAISE EXCEPTION 'VCR % not found', p_handover_point_id; END IF;

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

  RETURN jsonb_build_object(
    'handover_point_id', p_handover_point_id, 'status', 'READY',
    'template_id', v_template_id, 'active_count', v_active_count,
    'items_upserted', v_items_upserted, 'items_deleted', v_items_deleted,
    'approvers_upserted', v_approvers_upserted, 'rejected_reset', v_rejected_reset);
END;
$function$;

CREATE OR REPLACE FUNCTION public.decide_vcr_plan_approval(
  p_approver_row_id uuid, p_decision text, p_comment text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_row public.vcr_plan_approvers%ROWTYPE;
  v_caller uuid := auth.uid();
  v_phase int; v_has_ora boolean; v_ora_status text;
  v_any_rejected boolean; v_total int; v_approved int;
  v_new_plan_status public.vcr_plan_status;
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

  RETURN jsonb_build_object(
    'approver_row_id', p_approver_row_id,
    'row_status', p_decision,
    'plan_status', v_new_plan_status,
    'approved_count', v_approved, 'total_count', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decide_vcr_plan_approval(uuid,text,text) TO authenticated;
