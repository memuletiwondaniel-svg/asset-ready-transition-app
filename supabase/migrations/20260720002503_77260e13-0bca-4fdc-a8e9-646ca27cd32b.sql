CREATE TABLE public.vcr_insight_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vcr_id uuid NOT NULL,
  vcr_item_id uuid NOT NULL,
  inputs_hash text NOT NULL,
  insight_state text,
  signal_ids int[],
  thumb smallint NOT NULL CHECK (thumb IN (-1, 1)),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vcr_insight_feedback_user_hash_uniq UNIQUE (user_id, inputs_hash)
);

CREATE INDEX vcr_insight_feedback_item_idx
  ON public.vcr_insight_feedback (vcr_id, vcr_item_id);
CREATE INDEX vcr_insight_feedback_hash_idx
  ON public.vcr_insight_feedback (inputs_hash);

GRANT SELECT, INSERT ON public.vcr_insight_feedback TO authenticated;
GRANT ALL ON public.vcr_insight_feedback TO service_role;

ALTER TABLE public.vcr_insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcr_insight_feedback_insert_own"
  ON public.vcr_insight_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vcr_insight_feedback_select_own"
  ON public.vcr_insight_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "vcr_insight_feedback_select_admin"
  ON public.vcr_insight_feedback
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.user_role
  ));

-- QAQC F1: thumb domain + one-vote-per-(user, fingerprint)
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active)
VALUES (
  'F1',
  'F',
  'vcr_insight_feedback shape',
  'thumb in {-1,1} and unique (user_id, inputs_hash)',
  $qaqc$
  SELECT
    CASE
      WHEN (SELECT count(*) FROM public.vcr_insight_feedback WHERE thumb NOT IN (-1, 1)) > 0
        THEN 'FAIL: invalid thumb value present'
      WHEN EXISTS (
        SELECT 1 FROM public.vcr_insight_feedback
        GROUP BY user_id, inputs_hash HAVING count(*) > 1
      ) THEN 'FAIL: duplicate (user_id, inputs_hash) rows'
      ELSE 'PASS'
    END AS result
  $qaqc$,
  'error',
  true
)
ON CONFLICT (id) DO UPDATE
  SET category = EXCLUDED.category,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sql = EXCLUDED.sql,
      severity = EXCLUDED.severity,
      is_active = EXCLUDED.is_active;
