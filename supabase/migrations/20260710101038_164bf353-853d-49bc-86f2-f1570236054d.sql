
CREATE TABLE public.insight_eval_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_key text NOT NULL,
  fixture_path text NOT NULL,
  ground_truth jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_key, fixture_path)
);
GRANT SELECT ON public.insight_eval_cases TO authenticated;
GRANT ALL ON public.insight_eval_cases TO service_role;
ALTER TABLE public.insight_eval_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_cases_authenticated_read" ON public.insight_eval_cases
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.insight_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_key text NOT NULL,
  case_id uuid NOT NULL REFERENCES public.insight_eval_cases(id) ON DELETE CASCADE,
  precision_score numeric NOT NULL,
  recall_score numeric NOT NULL,
  headline_exact boolean NOT NULL,
  extracted jsonb NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insight_eval_runs TO authenticated;
GRANT ALL ON public.insight_eval_runs TO service_role;
ALTER TABLE public.insight_eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_runs_authenticated_read" ON public.insight_eval_runs
  FOR SELECT TO authenticated USING (true);
CREATE INDEX insight_eval_runs_schema_ran_idx
  ON public.insight_eval_runs (schema_key, ran_at DESC);

CREATE TABLE public.insight_schema_status (
  schema_key text PRIMARY KEY,
  eval_status text NOT NULL DEFAULT 'unproven' CHECK (eval_status IN ('passed','unproven')),
  aggregate jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insight_schema_status TO authenticated;
GRANT ALL ON public.insight_schema_status TO service_role;
ALTER TABLE public.insight_schema_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_status_authenticated_read" ON public.insight_schema_status
  FOR SELECT TO authenticated USING (true);
