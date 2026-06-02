ALTER TABLE public.p2a_handover_points
  ADD COLUMN IF NOT EXISTS systems_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS systems_finalized_by uuid;