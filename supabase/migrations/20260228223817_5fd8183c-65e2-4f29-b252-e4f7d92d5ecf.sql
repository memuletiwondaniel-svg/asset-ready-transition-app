CREATE TABLE public.vcr_discipline_assurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id UUID NOT NULL REFERENCES p2a_handover_points(id) ON DELETE CASCADE,
  discipline_role_id UUID REFERENCES roles(id),
  discipline_role_name TEXT NOT NULL,
  reviewer_user_id UUID,
  assurance_statement TEXT NOT NULL,
  statement_type TEXT NOT NULL DEFAULT 'discipline'
    CHECK (statement_type IN ('discipline', 'interdisciplinary')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(handover_point_id, discipline_role_name)
);

ALTER TABLE public.vcr_discipline_assurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assurance statements"
  ON public.vcr_discipline_assurance FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assurance statements"
  ON public.vcr_discipline_assurance FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own statements"
  ON public.vcr_discipline_assurance FOR UPDATE
  TO authenticated USING (reviewer_user_id = auth.uid());