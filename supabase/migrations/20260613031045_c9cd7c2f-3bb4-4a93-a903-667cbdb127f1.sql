-- ============================================================
-- VCR Plan Materialization Layer
-- ============================================================

-- 1. UNIQUE constraint for idempotent prereq upsert
ALTER TABLE public.p2a_vcr_prerequisites
  ADD CONSTRAINT p2a_vcr_prerequisites_handover_point_vcr_item_key
  UNIQUE (handover_point_id, vcr_item_id);

-- 2. vcr_plan_approvers table (separate from vcr_sof_approvers)
CREATE TYPE public.vcr_plan_approver_status AS ENUM ('PENDING','APPROVED','REJECTED');

CREATE TABLE public.vcr_plan_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_key text NOT NULL,
  role_label text NOT NULL,
  approver_order integer NOT NULL DEFAULT 0,
  status public.vcr_plan_approver_status NOT NULL DEFAULT 'PENDING',
  decided_at timestamptz,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_point_id, user_id)
);

CREATE INDEX idx_vcr_plan_approvers_handover_point ON public.vcr_plan_approvers(handover_point_id);
CREATE INDEX idx_vcr_plan_approvers_user           ON public.vcr_plan_approvers(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_plan_approvers TO authenticated;
GRANT ALL ON public.vcr_plan_approvers TO service_role;

ALTER TABLE public.vcr_plan_approvers ENABLE ROW LEVEL SECURITY;

-- Read-all authenticated
CREATE POLICY "vcr_plan_approvers_select_authenticated"
  ON public.vcr_plan_approvers
  FOR SELECT
  TO authenticated
  USING (true);

-- Approvers may update only their own row (their own decision)
CREATE POLICY "vcr_plan_approvers_update_own"
  ON public.vcr_plan_approvers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT/DELETE intentionally go through the SECURITY DEFINER RPC only.
-- (No INSERT/DELETE policy → direct client writes are blocked; the RPC bypasses RLS.)

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_vcr_plan_approvers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vcr_plan_approvers_updated_at
  BEFORE UPDATE ON public.vcr_plan_approvers
  FOR EACH ROW EXECUTE FUNCTION public.tg_vcr_plan_approvers_updated_at();

-- 3. submit_vcr_plan RPC — single atomic transaction
CREATE OR REPLACE FUNCTION public.submit_vcr_plan(
  p_handover_point_id uuid,
  p_items jsonb,       -- [{vcr_item_id, summary, display_order}]
  p_approvers jsonb    -- [{user_id, role_key, role_label, approver_order}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items_upserted     integer := 0;
  v_approvers_upserted integer := 0;
  v_protected          jsonb;
  v_incoming_users     uuid[];
BEGIN
  IF p_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'handover_point_id is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;
  IF p_approvers IS NULL OR jsonb_typeof(p_approvers) <> 'array' THEN
    RAISE EXCEPTION 'p_approvers must be a JSON array';
  END IF;

  -- Verify VCR exists
  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_points WHERE id = p_handover_point_id) THEN
    RAISE EXCEPTION 'VCR % not found', p_handover_point_id;
  END IF;

  -- 3a. Upsert prerequisites (idempotent on (handover_point_id, vcr_item_id))
  WITH ins AS (
    INSERT INTO public.p2a_vcr_prerequisites (
      handover_point_id, vcr_item_id, summary, status,
      delivering_party_id, display_order
    )
    SELECT
      p_handover_point_id,
      (elem->>'vcr_item_id')::uuid,
      COALESCE(NULLIF(elem->>'summary',''), 'VCR Item'),
      'NOT_STARTED'::p2a_vcr_prerequisite_status,
      NULL,
      COALESCE((elem->>'display_order')::int, 0)
    FROM jsonb_array_elements(p_items) AS elem
    WHERE (elem->>'vcr_item_id') IS NOT NULL
    ON CONFLICT (handover_point_id, vcr_item_id)
    DO UPDATE SET
      summary       = EXCLUDED.summary,
      display_order = EXCLUDED.display_order,
      updated_at    = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_items_upserted FROM ins;

  -- 3b. Reconcile approvers
  -- Collect incoming user_ids
  SELECT COALESCE(array_agg(DISTINCT (elem->>'user_id')::uuid), ARRAY[]::uuid[])
    INTO v_incoming_users
  FROM jsonb_array_elements(p_approvers) AS elem
  WHERE (elem->>'user_id') IS NOT NULL;

  -- Guard: refuse to delete approvers with a decision already recorded
  SELECT jsonb_agg(jsonb_build_object(
           'user_id', user_id,
           'role_label', role_label,
           'status', status
         ))
    INTO v_protected
  FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status <> 'PENDING'
    AND NOT (user_id = ANY(v_incoming_users));

  IF v_protected IS NOT NULL AND jsonb_array_length(v_protected) > 0 THEN
    RAISE EXCEPTION 'Cannot remove approvers with recorded decisions: %', v_protected::text
      USING ERRCODE = 'P0001';
  END IF;

  -- Delete only PENDING rows that are no longer in the incoming roster
  DELETE FROM public.vcr_plan_approvers
  WHERE handover_point_id = p_handover_point_id
    AND status = 'PENDING'
    AND NOT (user_id = ANY(v_incoming_users));

  -- Upsert incoming approvers; preserve status/decided_at on existing rows,
  -- only refresh metadata (role label/order). Status only set on initial INSERT.
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

  -- 3c. Flip VCR status to READY ("Submitted")
  UPDATE public.p2a_handover_points
     SET status = 'READY'::p2a_handover_point_status,
         updated_at = now()
   WHERE id = p_handover_point_id;

  RETURN jsonb_build_object(
    'handover_point_id',  p_handover_point_id,
    'status',             'READY',
    'items_upserted',     v_items_upserted,
    'approvers_upserted', v_approvers_upserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_vcr_plan(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_vcr_plan(uuid, jsonb, jsonb) TO authenticated;