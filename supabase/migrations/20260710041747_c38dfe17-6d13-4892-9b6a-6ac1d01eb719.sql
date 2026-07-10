
-- Align VCR item write-side RLS with the same PTM→roster→org role resolution
-- the UI uses to render CTAs. Fixes:
--   1. Delivering party resolved via vcr_items.delivering_party_role_id
--      (roster/org branches) was rejected because helpers only checked the
--      vcr_item_delivering_parties junction (explicit override, empty by design).
--   2. Approver check compared a role-name label to role UUIDs cast to text.
-- Self-attribution (uploaded_by / author_user_id = auth.uid()) is preserved.

-- 1. Delivering-party helper: junction override OR role-resolved via resolve_project_role_user
CREATE OR REPLACE FUNCTION public.is_vcr_item_delivering_party(
  _user_id uuid, _vcr_item_id uuid, _handover_point_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.vcr_item_delivering_parties
      WHERE user_id = _user_id
        AND vcr_item_id = _vcr_item_id
        AND handover_point_id = _handover_point_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.vcr_items vi
      JOIN public.roles r ON r.id = vi.delivering_party_role_id
      JOIN public.p2a_handover_points hp ON hp.id = _handover_point_id
      JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
      WHERE vi.id = _vcr_item_id
        AND vi.delivering_party_role_id IS NOT NULL
        AND public.resolve_project_role_user(hpl.project_id, r.name) = _user_id
    );
$$;

-- 2. Approving-party helper: iterate approving_party_role_ids (uuid[]) and resolve
--    each to its canonical holder via resolve_project_role_user.
CREATE OR REPLACE FUNCTION public.is_vcr_item_approving_party(
  _user_id uuid, _vcr_item_id uuid, _handover_point_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vcr_items vi
    JOIN public.p2a_handover_points hp ON hp.id = _handover_point_id
    JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
    CROSS JOIN LATERAL unnest(COALESCE(vi.approving_party_role_ids, ARRAY[]::uuid[])) AS role_uuid
    JOIN public.roles r ON r.id = role_uuid
    WHERE vi.id = _vcr_item_id
      AND public.resolve_project_role_user(hpl.project_id, r.name) = _user_id
  );
$$;

-- 3. Evidence-side party check: reuse is_vcr_item_party by dereferencing the prerequisite.
CREATE OR REPLACE FUNCTION public.is_p2a_vcr_evidence_party(
  _prereq_id uuid, _user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.p2a_vcr_prerequisites pp
    WHERE pp.id = _prereq_id
      AND public.is_vcr_item_party(_user_id, pp.vcr_item_id, pp.handover_point_id)
  );
$$;

-- 4. Rewrite p2a_vcr_evidence write policies: delivering OR approver, self-attributed.
DROP POLICY IF EXISTS "Delivering party can add VCR evidence"    ON public.p2a_vcr_evidence;
DROP POLICY IF EXISTS "Delivering party can update VCR evidence" ON public.p2a_vcr_evidence;
DROP POLICY IF EXISTS "Delivering party can delete VCR evidence" ON public.p2a_vcr_evidence;

CREATE POLICY "Item parties can add VCR evidence"
  ON public.p2a_vcr_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_p2a_vcr_evidence_party(vcr_prerequisite_id, auth.uid())
  );

CREATE POLICY "Item parties can update VCR evidence"
  ON public.p2a_vcr_evidence FOR UPDATE TO authenticated
  USING (public.is_p2a_vcr_evidence_party(vcr_prerequisite_id, auth.uid()))
  WITH CHECK (public.is_p2a_vcr_evidence_party(vcr_prerequisite_id, auth.uid()));

CREATE POLICY "Item parties can delete VCR evidence"
  ON public.p2a_vcr_evidence FOR DELETE TO authenticated
  USING (public.is_p2a_vcr_evidence_party(vcr_prerequisite_id, auth.uid()));

-- vcr_item_comments INSERT policy already delegates to is_vcr_item_party,
-- so it inherits the fix through the helper rewrite above — no policy change needed.
