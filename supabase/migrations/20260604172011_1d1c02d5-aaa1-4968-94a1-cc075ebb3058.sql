CREATE TABLE public.p2a_vcr_maintenance_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  deliverable_type text NOT NULL CHECK (deliverable_type IN ('ARB','PM_ROUTINES','BOM','SPARES','RISKPOYNT','IMS')),
  is_applicable boolean NOT NULL DEFAULT false,
  comments text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_point_id, deliverable_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_maintenance_deliverables TO authenticated;
GRANT ALL ON public.p2a_vcr_maintenance_deliverables TO service_role;

ALTER TABLE public.p2a_vcr_maintenance_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_deliverables read auth"
  ON public.p2a_vcr_maintenance_deliverables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sr ORA Engr can insert VCR maintenance_deliverables"
  ON public.p2a_vcr_maintenance_deliverables
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_role('Sr ORA Engr'));

CREATE POLICY "Sr ORA Engr can update VCR maintenance_deliverables"
  ON public.p2a_vcr_maintenance_deliverables
  FOR UPDATE TO authenticated
  USING (public.current_user_has_role('Sr ORA Engr'))
  WITH CHECK (public.current_user_has_role('Sr ORA Engr'));

CREATE POLICY "Sr ORA Engr can delete VCR maintenance_deliverables"
  ON public.p2a_vcr_maintenance_deliverables
  FOR DELETE TO authenticated
  USING (public.current_user_has_role('Sr ORA Engr'));

CREATE INDEX idx_p2a_vcr_maint_deliv_hp ON public.p2a_vcr_maintenance_deliverables(handover_point_id);

CREATE TRIGGER set_p2a_vcr_maint_deliv_updated_at
  BEFORE UPDATE ON public.p2a_vcr_maintenance_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();