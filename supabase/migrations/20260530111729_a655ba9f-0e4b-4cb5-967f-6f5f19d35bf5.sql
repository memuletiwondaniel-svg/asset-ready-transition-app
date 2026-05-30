
-- B2B partner helper: returns true when auth.uid() shares the exact same
-- normalized active position with target_user_id AND exactly two active
-- users hold that position. Matches the client-side rule in useB2BPartner.ts.
CREATE OR REPLACE FUNCTION public.is_b2b_partner_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT lower(btrim(regexp_replace(coalesce(position, ''), '\s+', ' ', 'g'))) AS pos
    FROM public.profiles
    WHERE user_id = auth.uid() AND is_active = true
  ),
  target AS (
    SELECT lower(btrim(regexp_replace(coalesce(position, ''), '\s+', ' ', 'g'))) AS pos
    FROM public.profiles
    WHERE user_id = target_user_id AND is_active = true
  ),
  sharing AS (
    SELECT count(*) AS n
    FROM public.profiles p, me
    WHERE p.is_active = true
      AND me.pos <> ''
      AND lower(btrim(regexp_replace(coalesce(p.position, ''), '\s+', ' ', 'g'))) = me.pos
  )
  SELECT auth.uid() IS NOT NULL
     AND target_user_id IS NOT NULL
     AND auth.uid() <> target_user_id
     AND (SELECT pos FROM me) <> ''
     AND (SELECT pos FROM me) = (SELECT pos FROM target)
     AND (SELECT n FROM sharing) = 2;
$$;

GRANT EXECUTE ON FUNCTION public.is_b2b_partner_of(uuid) TO authenticated;

-- Widen UPDATE policies so a B2B partner can act on the assigned row.

-- task_reviewers
DROP POLICY IF EXISTS "Task owners and reviewers can update" ON public.task_reviewers;
CREATE POLICY "Task owners and reviewers can update"
ON public.task_reviewers
FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
  OR public.is_b2b_partner_of(user_id)
  OR EXISTS (
    SELECT 1 FROM public.user_tasks ut
    WHERE ut.id = task_reviewers.task_id
      AND ut.user_id = (SELECT auth.uid())
  )
);

-- pssr_item_approvals
DROP POLICY IF EXISTS "Approvers can update their own item approvals" ON public.pssr_item_approvals;
CREATE POLICY "Approvers can update their own item approvals"
ON public.pssr_item_approvals
FOR UPDATE
USING (
  approver_user_id = (SELECT auth.uid())
  OR public.is_b2b_partner_of(approver_user_id)
  OR public.user_is_admin((SELECT auth.uid()))
);

-- pssr_discipline_reviews
DROP POLICY IF EXISTS "Reviewers can update their own discipline reviews" ON public.pssr_discipline_reviews;
CREATE POLICY "Reviewers can update their own discipline reviews"
ON public.pssr_discipline_reviews
FOR UPDATE
USING (
  reviewer_user_id = (SELECT auth.uid())
  OR public.is_b2b_partner_of(reviewer_user_id)
  OR public.user_is_admin((SELECT auth.uid()))
);

-- p2a_approval_workflow
DROP POLICY IF EXISTS "Users can update approval workflows" ON public.p2a_approval_workflow;
CREATE POLICY "Users can update approval workflows"
ON public.p2a_approval_workflow
FOR UPDATE
USING (
  (SELECT auth.uid()) = approver_user_id
  OR public.is_b2b_partner_of(approver_user_id)
  OR EXISTS (
    SELECT 1 FROM public.p2a_handovers
    WHERE p2a_handovers.id = p2a_approval_workflow.handover_id
      AND p2a_handovers.created_by = (SELECT auth.uid())
  )
  OR public.user_is_admin((SELECT auth.uid()))
);

-- orm_tasks: assigned user OR their B2B partner can update
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON public.orm_tasks;
CREATE POLICY "Assigned users can update their tasks"
ON public.orm_tasks
FOR UPDATE
USING (
  (SELECT auth.uid()) = assigned_to
  OR public.is_b2b_partner_of(assigned_to)
);
