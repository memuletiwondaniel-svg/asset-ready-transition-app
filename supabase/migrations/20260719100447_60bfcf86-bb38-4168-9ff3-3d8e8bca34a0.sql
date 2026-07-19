
-- 1. Promote p2a_system_itrs.discipline free-text → enum
CREATE TYPE public.p2a_itr_discipline AS ENUM ('INS','ELE','MEC','PIP','CIV');

ALTER TABLE public.p2a_system_itrs
  ALTER COLUMN discipline TYPE public.p2a_itr_discipline
  USING CASE upper(coalesce(discipline,''))
    WHEN 'INSTRUMENTATION' THEN 'INS'::public.p2a_itr_discipline
    WHEN 'ELECTRICAL'      THEN 'ELE'::public.p2a_itr_discipline
    WHEN 'MECHANICAL'      THEN 'MEC'::public.p2a_itr_discipline
    WHEN 'PIPING'          THEN 'PIP'::public.p2a_itr_discipline
    WHEN 'CIVIL'           THEN 'CIV'::public.p2a_itr_discipline
    WHEN 'INS' THEN 'INS'::public.p2a_itr_discipline
    WHEN 'ELE' THEN 'ELE'::public.p2a_itr_discipline
    WHEN 'MEC' THEN 'MEC'::public.p2a_itr_discipline
    WHEN 'PIP' THEN 'PIP'::public.p2a_itr_discipline
    WHEN 'CIV' THEN 'CIV'::public.p2a_itr_discipline
    ELSE NULL
  END;

-- 2. Punch activity log (comments thread)
CREATE TABLE public.p2a_system_punch_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  punch_id UUID NOT NULL REFERENCES public.p2a_system_punch_items(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_punch_activity_log_punch ON public.p2a_system_punch_activity_log(punch_id, created_at DESC);

GRANT SELECT, INSERT ON public.p2a_system_punch_activity_log TO authenticated;
GRANT ALL ON public.p2a_system_punch_activity_log TO service_role;

ALTER TABLE public.p2a_system_punch_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read punch activity"
  ON public.p2a_system_punch_activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own punch comments"
  ON public.p2a_system_punch_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid());
