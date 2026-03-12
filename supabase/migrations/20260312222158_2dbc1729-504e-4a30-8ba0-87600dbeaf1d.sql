
CREATE TABLE public.p2a_approver_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES p2a_handover_plans(id) ON DELETE CASCADE,
  original_approver_id UUID,
  user_id UUID,
  role_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ DEFAULT now(),
  cycle INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.p2a_approver_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read approver history"
  ON public.p2a_approver_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert approver history"
  ON public.p2a_approver_history FOR INSERT TO authenticated WITH CHECK (true);
