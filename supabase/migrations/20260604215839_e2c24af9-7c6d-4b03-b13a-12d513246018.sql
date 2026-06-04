
ALTER TABLE public.p2a_handover_points
  ADD COLUMN IF NOT EXISTS sof_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sof_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pac_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pac_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.p2a_handover_points.sof_signed_at IS 'Statement of Fact sign-off timestamp (HC VCRs only).';
COMMENT ON COLUMN public.p2a_handover_points.pac_signed_at IS 'Provisional Acceptance Certificate sign-off timestamp (non-HC VCRs only).';
