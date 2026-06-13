CREATE TABLE public.vcr_plan_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('submitter','baseline')),
  snapshot jsonb NOT NULL,
  snapshot_hash text GENERATED ALWAYS AS (md5(snapshot::text)) STORED,
  voided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vcr_plan_snapshots_hp_kind
  ON public.vcr_plan_snapshots (handover_point_id, kind, created_at DESC);

GRANT SELECT ON public.vcr_plan_snapshots TO authenticated;
GRANT ALL ON public.vcr_plan_snapshots TO service_role;

ALTER TABLE public.vcr_plan_snapshots ENABLE ROW LEVEL SECURITY;

-- Read: creator, any approver on this plan, or a project team member of the
-- owning project. Writes are RPC-only (SECURITY DEFINER) — no INSERT/UPDATE/
-- DELETE policy is granted to authenticated.
CREATE POLICY vcr_plan_snapshots_read ON public.vcr_plan_snapshots
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.vcr_plan_approvers a
    WHERE a.handover_point_id = vcr_plan_snapshots.handover_point_id
      AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.p2a_handover_points hp
    JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
    JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
    WHERE hp.id = vcr_plan_snapshots.handover_point_id
      AND ptm.user_id = auth.uid()
  )
);