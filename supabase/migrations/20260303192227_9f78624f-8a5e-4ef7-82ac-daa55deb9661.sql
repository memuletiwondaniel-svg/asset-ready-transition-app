
CREATE TABLE public.backlog_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backlog_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own groups"
  ON public.backlog_groups FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.personal_backlog
  ADD COLUMN group_id UUID REFERENCES public.backlog_groups(id) ON DELETE SET NULL;
