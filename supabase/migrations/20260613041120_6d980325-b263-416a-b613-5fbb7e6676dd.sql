-- ============================================================================
-- submit_vcr_plan v2 — server-derived active set + reconcile + ledger guard
-- ============================================================================
-- Replaces the v1 signature (uuid, jsonb, jsonb) with (uuid, jsonb).
-- The active checklist is now computed server-side from the same source the
-- wizard's Step 9 / Step 10 use (catalog template items ∩ vcr_items.is_active
-- MINUS p2a_vcr_item_overrides.is_na=true). The client no longer passes items,
-- so the UI count and the materialized rows can never diverge.
--
-- Reconcile on re-submit:
--   * UPSERT all currently-active items (idempotent on (handover_point_id, vcr_item_id)).
--   * DELETE prereq rows whose vcr_item is no longer active (newly N/A), but
--     ONLY if no vcr_prerequisite_approvals row exists for them with a recorded
--     decision (status != PENDING). If any such ledger entry exists, RAISE —
--     mirrors the decided-approver removal guard.

-- Drop the v1 to free the name; the new signature has a different arity.
DROP FUNCTION IF EXISTS public.submit_vcr_plan(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.submit_vcr_plan(
  p_handover_point_id uuid,
  p_approvers jsonb    -- [{user_id, role_key, role_label, approver_order}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_hc             boolean := false;
  v_template_id        uuid;
  v_active_count       integer := 0;
  v_items_upserted     integer := 0;
  v_items_deleted      integer := 0;
  v_approvers_upserted integer := 0;
  v_protected_items    jsonb;
  v_protected_apvrs    jsonb;
  v_incoming_users     uuid[];
  HC_TEMPLATE          constant uuid := '363a831c-edb3-4224-a97f-2e8b11fac2dc';
  NON_HC_TEMPLATE      constant uuid := '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';
BEGIN
  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'handover_point_id is required';
  END IF;
  IF p_approvers IS NULL OR jsonb_typeof(p_approvers) <> 'array' THEN
    RAISE EXCEPTION 'p_approvers must be a JSON array';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_points WHERE id = p_handover_point_id) THEN
    RAISE EXCEPTION 'VCR % not found', p_handover_point_id;
  END IF;

  -- 1. Resolve hydrocarbon status from linked systems → template id.
  SELECT bool_or(s.is_hydrocarbon) INTO v_has_hc
  FROM public.p2a_handover_point_systems ps
  JOIN public.p2a_systems s ON s.id = ps.system_id
  WHERE ps.handover_point_id = p_handover_point_id;

  v_template_id := CASE WHEN COALESCE(v_has_hc, false) THEN HC_TEMPLATE ELSE NON_HC_TEMPLATE END;

  -- 2. Derive the AUTHORITATIVE active item set, server-side.
  --    active = template items ∩ vcr_items.is_active=true
  --             MINUS p2a_vcr_item_overrides.is_na=true.
  CREATE TEMP TABLE _active_items ON COMMIT DROP AS
  SELECT
    vi.id           AS vcr_item_id,
    vi.vcr_item     AS summary,
    vi.display_order
  FROM public.vcr_template_items ti
  JOIN public.vcr_items vi
    ON vi.id = ti.vcr_item_id
   AND vi.is_active = true
  WHERE ti.template_id = v_template_id
    AND NOT EXISTS (
      SELECT 1 FROM public.p2a_vcr_item_overrides ov
      WHERE ov.handover_point_id = p_handover_point_id
        AND ov.vcr_item_id = vi.id
        AND ov.is_na = true
    );

  SELECT COUNT(*) INTO v_active_count FROM _active_items;

  IF v_active_count = 0 THEN
    RAISE EXCEPTION 'No active checklist items for this VCR (all items are N/A or template is empty)'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Guard reconcile DELETEs: any existing prereq row for a vcr_item that is
  --    no longer active AND has a recorded approval decision must NOT be removed.
  SELECT jsonb_agg(jsonb_build_object(
           'prerequisite_id', p.id,
           'vcr_item_id', p.vcr_item_id,
           'summary', p.summary,
           'decisions', d.decisions
         ))
    INTO v_protected_items
  FROM public.p2a_vcr_prerequisites p
  JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'approver_user_id', a.approver_user_id,
             'status', a.status,
             'decided_at', a.decided_at
           )) AS decisions
    FROM public.vcr_prerequisite_approvals a
    WHERE a.prerequisite_id = p.id
      AND a.status <> 'PENDING'
  ) d ON d.decisions IS NOT NULL
  WHERE p.handover_point_id = p_handover_point_id
    AND NOT EXISTS (
      SELECT 1 FROM _active_items ai WHERE ai.vcr_item_id = p.vcr_item_id
    );

  IF v_protected_items IS NOT NULL AND jsonb_array_length(v_protected_items) > 0 THEN
    RAISE EXCEPTION 'Cannot remove checklist items with recorded approval decisions: %', v_protected_items::text
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. UPSERT currently-active items (idempotent).
  WITH ins AS (
    INSERT INTO public.p2a_vcr_prerequisites (
      handover_point_id, vcr_item_id, summary, status,
      delivering_party_id, display_order
    )
    SELECT
      p_handover_point_id,
      ai.vcr_item_id,
      COALESCE(NULLIF(ai.summary,''), 'VCR Item'),
      'NOT_STARTED'::p2a_vcr_prerequisite_status,
      NULL,
      COALESCE(ai.display_order, 0)
    FROM _active_items ai
    ON CONFLICT (handover_point_id, vcr_item_id)
    DO UPDATE SET
      summary       = EXCLUDED.summary,
      display_order = EXCLUDED.display_order,
      updated_at    = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_items_upserted FROM ins;

  -- 5. Reconcile: delete prereq rows whose item is no longer active (and which
  --    the guard above proved have no recorded decisions).
  WITH del AS (
    DELETE FROM public.p2a_vcr_prerequisites p
    WHERE p.handover_point_id = p_handover_point_id
      AND NOT EXISTS (
        SELECT 1 FROM _active_items ai WHERE ai.vcr_item_id = p.vcr_item_id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_items_deleted FROM del;

  -- 6. Reconcile approvers (unchanged from v1).
  SELECT COALESCE(array_agg(DISTINCT (elem->>'user_id')::uuid), ARRAY[]::uuid[])
    INTO v_incoming_users
  FROM jsonb_array_elements(p_approvers) AS elem
  WHERE (elem->>'user_id') IS NOT NULL;

  SELECT jsonb_agg(jsonb_build_object(
           'user_id', user_id,
           'role_label', role_label,
           'status', status
         ))
    INTO v_protected_apvrs
  FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status <> 'PENDING'
    AND NOT (user_id = ANY(v_incoming_users));

  IF v_protected_apvrs IS NOT NULL AND jsonb_array_length(v_protected_apvrs) > 0 THEN
    RAISE EXCEPTION 'Cannot remove approvers with recorded decisions: %', v_protected_apvrs::text
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status = 'PENDING'
    AND NOT (user_id = ANY(v_incoming_users));

  WITH upserted AS (
    INSERT INTO public.vcr_plan_approvers (
      handover_point_id, user_id, role_key, role_label, approver_order, status
    )
    SELECT
      p_handover_point_id,
      (elem->>'user_id')::uuid,
      COALESCE(NULLIF(elem->>'role_key',''), 'custom'),
      COALESCE(NULLIF(elem->>'role_label',''), 'Approver'),
      COALESCE((elem->>'approver_order')::int, 0),
      'PENDING'::vcr_plan_approver_status
    FROM jsonb_array_elements(p_approvers) AS elem
    WHERE (elem->>'user_id') IS NOT NULL
    ON CONFLICT (handover_point_id, user_id)
    DO UPDATE SET
      role_key       = EXCLUDED.role_key,
      role_label     = EXCLUDED.role_label,
      approver_order = EXCLUDED.approver_order,
      updated_at     = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_approvers_upserted FROM upserted;

  -- 7. Flip VCR status to READY.
  UPDATE public.p2a_handover_points
     SET status = 'READY'::p2a_handover_point_status,
         updated_at = now()
   WHERE id = p_handover_point_id;

  RETURN jsonb_build_object(
    'handover_point_id',  p_handover_point_id,
    'status',             'READY',
    'template_id',        v_template_id,
    'active_count',       v_active_count,
    'items_upserted',     v_items_upserted,
    'items_deleted',      v_items_deleted,
    'approvers_upserted', v_approvers_upserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_vcr_plan(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_vcr_plan(uuid, jsonb) TO authenticated;