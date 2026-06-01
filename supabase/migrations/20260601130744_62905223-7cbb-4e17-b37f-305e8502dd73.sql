-- ============================================================================
-- Migration 6: Per-table approval gate hardening (3 distinct policy sets)
-- ============================================================================

-- Spec-label guard: fail closed if any required label is missing/retired.
DO $$
DECLARE
  spec_labels text[] := ARRAY[
    'Project Hub Lead','Dep. Plant Director',
    'Construction Lead','Commissioning Lead'
  ];
  missing text;
BEGIN
  SELECT string_agg(l, ', ') INTO missing
  FROM unnest(spec_labels) l
  WHERE NOT EXISTS (
    SELECT 1 FROM public.roles
    WHERE name = l AND is_active = true AND is_retired = false
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Mig 6 abort: spec labels missing from roles catalog: %', missing;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Role-label authorization helper (label-based, NOT app_role enum)
-- profiles.role -> roles.id; we check roles.name matches the label.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role_label text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role
    WHERE p.user_id = auth.uid()
      AND r.name = _role_label
      AND r.is_active = true
      AND r.is_retired = false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_role(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_has_role(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.current_user_has_role(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_user_has_role(text) TO service_role;

-- ----------------------------------------------------------------------------
-- Gate functions: legacy=>TRUE; else COUNT(DISTINCT role in spec set
-- AND status APPROVED AND role active+not retired) = required_count.
-- DISTINCT prevents same-role-twice from inflating the count.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orp_plan_is_approved(_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _model text;
  _count int;
BEGIN
  SELECT gate_model INTO _model FROM public.orp_plans WHERE id = _plan_id;
  IF _model = 'legacy' THEN RETURN true; END IF;

  SELECT COUNT(DISTINCT a.approver_role) INTO _count
  FROM public.orp_approvals a
  JOIN public.roles r ON r.name = a.approver_role
  WHERE a.orp_plan_id = _plan_id
    AND a.status = 'APPROVED'
    AND a.approver_role IN ('Project Hub Lead','Dep. Plant Director')
    AND r.is_active = true
    AND r.is_retired = false;

  RETURN _count = 2;
END $$;

CREATE OR REPLACE FUNCTION public.p2a_plan_is_approved(_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _model text;
  _count int;
BEGIN
  SELECT gate_model INTO _model FROM public.p2a_handover_plans WHERE id = _plan_id;
  IF _model = 'legacy' THEN RETURN true; END IF;

  SELECT COUNT(DISTINCT a.approver_role) INTO _count
  FROM public.p2a_plan_approvals a
  JOIN public.roles r ON r.name = a.approver_role
  WHERE a.handover_plan_id = _plan_id
    AND a.status = 'APPROVED'
    AND a.approver_role IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
    AND r.is_active = true
    AND r.is_retired = false;

  RETURN _count = 4;
END $$;

CREATE OR REPLACE FUNCTION public.vcr_plan_is_approved(_handover_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _model text;
  _count int;
BEGIN
  SELECT gate_model INTO _model FROM public.p2a_handover_plans WHERE id = _handover_id;
  IF _model = 'legacy' THEN RETURN true; END IF;

  SELECT COUNT(DISTINCT a.role_name) INTO _count
  FROM public.p2a_handover_approvers a
  JOIN public.roles r ON r.name = a.role_name
  WHERE a.handover_id = _handover_id
    AND a.status = 'APPROVED'
    AND a.role_name IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
    AND r.is_active = true
    AND r.is_retired = false;

  RETURN _count = 4;
END $$;

REVOKE EXECUTE ON FUNCTION public.orp_plan_is_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.p2a_plan_is_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vcr_plan_is_approved(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.orp_plan_is_approved(uuid) TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.p2a_plan_is_approved(uuid) TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.vcr_plan_is_approved(uuid) TO authenticated, service_role;

-- ============================================================================
-- POLICY SET 1: orp_approvals (approver_user_id / approver_role; ORA 2-role)
-- ============================================================================
DROP POLICY IF EXISTS "ORP creators can manage approvals (INSERT)" ON public.orp_approvals;
DROP POLICY IF EXISTS "ORP creators can manage approvals (DELETE)" ON public.orp_approvals;
DROP POLICY IF EXISTS "Approvers can update approvals"            ON public.orp_approvals;

CREATE POLICY "orp_approvals_insert_creator_spec"
ON public.orp_approvals
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orp_plans p
    WHERE p.id = orp_approvals.orp_plan_id
      AND p.created_by = auth.uid()
  )
  AND approver_role IN ('Project Hub Lead','Dep. Plant Director')
  AND status = 'PENDING'
  AND approver_user_id IS NULL
  AND approved_at IS NULL
  AND cycle = 1
);

CREATE POLICY "orp_approvals_update_own_role"
ON public.orp_approvals
FOR UPDATE TO authenticated
USING (
  auth.uid() = approver_user_id
  AND public.current_user_has_role(approver_role)
);

CREATE POLICY "orp_approvals_delete_blocked"
ON public.orp_approvals
FOR DELETE TO authenticated
USING (false);

-- ============================================================================
-- POLICY SET 2: p2a_plan_approvals (approver_user_id / approver_role; P2A 4-role)
-- NOTE: this table uses decided_at/decided_by (no approved_at column).
-- ============================================================================
DROP POLICY IF EXISTS "Plan creators can manage approvals (INSERT)" ON public.p2a_plan_approvals;
DROP POLICY IF EXISTS "Plan creators can manage approvals (DELETE)" ON public.p2a_plan_approvals;
DROP POLICY IF EXISTS "Approvers can update their own approval"     ON public.p2a_plan_approvals;

CREATE POLICY "p2a_plan_approvals_insert_creator_spec"
ON public.p2a_plan_approvals
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.p2a_handover_plans p
    WHERE p.id = p2a_plan_approvals.handover_plan_id
      AND p.created_by = auth.uid()
  )
  AND approver_role IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
  AND status = 'PENDING'
  AND approver_user_id IS NULL
  AND decided_at IS NULL
  AND decided_by IS NULL
  AND cycle = 1
);

CREATE POLICY "p2a_plan_approvals_update_own_role"
ON public.p2a_plan_approvals
FOR UPDATE TO authenticated
USING (
  auth.uid() = approver_user_id
  AND public.current_user_has_role(approver_role)
);

CREATE POLICY "p2a_plan_approvals_delete_blocked"
ON public.p2a_plan_approvals
FOR DELETE TO authenticated
USING (false);

-- ============================================================================
-- POLICY SET 3: p2a_handover_approvers (user_id / role_name; VCR 4-role)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage approvers (INSERT)" ON public.p2a_handover_approvers;
DROP POLICY IF EXISTS "Authenticated users can manage approvers (DELETE)" ON public.p2a_handover_approvers;
DROP POLICY IF EXISTS "Authenticated users can manage approvers (UPDATE)" ON public.p2a_handover_approvers;

CREATE POLICY "p2a_handover_approvers_insert_creator_spec"
ON public.p2a_handover_approvers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.p2a_handover_plans p
    WHERE p.id = p2a_handover_approvers.handover_id
      AND p.created_by = auth.uid()
  )
  AND role_name IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
  AND status = 'PENDING'
  AND user_id IS NULL
  AND approved_at IS NULL
  AND cycle = 1
);

CREATE POLICY "p2a_handover_approvers_update_own_role"
ON public.p2a_handover_approvers
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND public.current_user_has_role(role_name)
);

CREATE POLICY "p2a_handover_approvers_delete_blocked"
ON public.p2a_handover_approvers
FOR DELETE TO authenticated
USING (false);
