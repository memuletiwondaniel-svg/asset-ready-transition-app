
-- Helper: is _user_id an approver (via ledger) for the prereq matching this (vcr_item_id, handover_point_id)?
CREATE OR REPLACE FUNCTION public.is_vcr_item_approver_ledger(_user_id uuid, _vcr_item_id uuid, _handover_point_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vcr_prerequisite_approvals a
    JOIN public.p2a_vcr_prerequisites p ON p.id = a.prerequisite_id
    WHERE a.approver_user_id = _user_id
      AND p.vcr_item_id = _vcr_item_id
      AND p.handover_point_id = _handover_point_id
  );
$$;

-- Replace INSERT policy to also allow approvers surfaced via the approvals ledger
-- (role-resolution alone misses users seeded directly into vcr_prerequisite_approvals).
DROP POLICY IF EXISTS "Item parties can insert comments" ON public.vcr_item_comments;
CREATE POLICY "Item parties can insert comments"
ON public.vcr_item_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND (
    public.is_vcr_item_party(auth.uid(), vcr_item_id, handover_point_id)
    OR public.is_vcr_item_approver_ledger(auth.uid(), vcr_item_id, handover_point_id)
  )
);
