
CREATE TABLE public.p2a_itp_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  inspection_type TEXT NOT NULL DEFAULT 'NA' CHECK (inspection_type IN ('WITNESS', 'HOLD', 'NA')),
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_itp_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ITP activities"
  ON public.p2a_itp_activities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ITP activities"
  ON public.p2a_itp_activities FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ITP activities"
  ON public.p2a_itp_activities FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete ITP activities"
  ON public.p2a_itp_activities FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_p2a_itp_activities_updated_at
  BEFORE UPDATE ON public.p2a_itp_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_p2a_itp_activities_handover ON public.p2a_itp_activities(handover_point_id);
CREATE INDEX idx_p2a_itp_activities_system ON public.p2a_itp_activities(system_id);
