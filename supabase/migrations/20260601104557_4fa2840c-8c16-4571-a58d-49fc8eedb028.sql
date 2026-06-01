-- M3: Per-approver state for P2A plan-level approval (the 4-lead gate)
-- Sibling to p2a_approval_workflow (which is per-handover-stage) — the two do not overlap.

-- 1) CREATE TABLE
CREATE TABLE IF NOT EXISTS public.p2a_plan_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_plan_id uuid NOT NULL REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE,
  approver_role text NOT NULL,
  approver_user_id uuid,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  decided_at timestamptz,
  decided_by uuid,
  comments text,
  cycle integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_plan_id, approver_role, cycle)
);

-- 2) GRANT — auth-only table; service_role for edge functions / harness teardown
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_plan_approvals TO authenticated;
GRANT ALL ON public.p2a_plan_approvals TO service_role;

-- 3) Enable RLS
ALTER TABLE public.p2a_plan_approvals ENABLE ROW LEVEL SECURITY;

-- 4) Policies (mirror of orp_approvals pattern)

CREATE POLICY "Users can view all plan approvals"
  ON public.p2a_plan_approvals
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Plan creators can manage approvals (INSERT)"
  ON public.p2a_plan_approvals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.p2a_handover_plans p
      WHERE p.id = handover_plan_id
        AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Plan creators can manage approvals (DELETE)"
  ON public.p2a_plan_approvals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.p2a_handover_plans p
      WHERE p.id = handover_plan_id
        AND p.created_by = (SELECT auth.uid())
    )
  );

-- THE M10-style hardening rule for approval writes:
-- Only the assigned approver can update their own decision.
CREATE POLICY "Approvers can update their own approval"
  ON public.p2a_plan_approvals
  FOR UPDATE
  USING ((SELECT auth.uid()) = approver_user_id);

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION public.update_p2a_plan_approvals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.update_p2a_plan_approvals_updated_at() SET search_path = public;

DROP TRIGGER IF EXISTS trg_p2a_plan_approvals_touch ON public.p2a_plan_approvals;
CREATE TRIGGER trg_p2a_plan_approvals_touch
  BEFORE UPDATE ON public.p2a_plan_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_p2a_plan_approvals_updated_at();

-- Lookup index for the join gate: "count approvals on plan X cycle Y"
CREATE INDEX IF NOT EXISTS p2a_plan_approvals_gate_idx
  ON public.p2a_plan_approvals (handover_plan_id, cycle, status);