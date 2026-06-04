
-- VCR SoF approvers table — separate from PSSR-based sof_approvers
CREATE TABLE public.vcr_sof_approvers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  approver_name text NOT NULL,
  approver_role text NOT NULL,
  approver_level integer NOT NULL,
  status text NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('SIGNED','PENDING','LOCKED')),
  signed_at timestamptz,
  signature_data text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_point_id, user_id)
);

CREATE INDEX idx_vcr_sof_approvers_hp ON public.vcr_sof_approvers(handover_point_id);
CREATE INDEX idx_vcr_sof_approvers_user ON public.vcr_sof_approvers(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_sof_approvers TO authenticated;
GRANT ALL ON public.vcr_sof_approvers TO service_role;

ALTER TABLE public.vcr_sof_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read vcr_sof_approvers"
  ON public.vcr_sof_approvers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update their own vcr_sof_approver row"
  ON public.vcr_sof_approvers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert vcr_sof_approvers"
  ON public.vcr_sof_approvers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER trg_vcr_sof_approvers_updated_at
  BEFORE UPDATE ON public.vcr_sof_approvers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
