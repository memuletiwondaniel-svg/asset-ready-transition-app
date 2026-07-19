
-- Extend E5 eval-coverage check to cover S1/S2/S4/S10 alongside S7.
UPDATE public.qaqc_checks
SET title = 'Workflow-signal eval coverage fresh & passing (S1/S2/S4/S7/S10)',
    sql = $CHECK$
WITH expected(schema_key) AS (
  VALUES
    ('vcr_workflow_signal_1'),
    ('vcr_workflow_signal_2'),
    ('vcr_workflow_signal_4'),
    ('vcr_workflow_signal_7'),
    ('vcr_workflow_signal_10')
)
SELECT e.schema_key,
       COALESCE(s.eval_status, 'missing') AS eval_status,
       s.updated_at
  FROM expected e
  LEFT JOIN public.insight_schema_status s
    ON s.schema_key = e.schema_key
 WHERE s.schema_key IS NULL
    OR s.eval_status <> 'passed'
    OR s.updated_at < now() - interval '30 days'
$CHECK$
WHERE id = 'E5';

-- Seed placeholder rows so the first eval run has something to upsert into;
-- the edge function will flip these to 'passed' when goldens are all green.
INSERT INTO public.insight_schema_status (schema_key, eval_status, aggregate, updated_at)
VALUES
  ('vcr_workflow_signal_1', 'unproven', '{}'::jsonb, now() - interval '31 days'),
  ('vcr_workflow_signal_2', 'unproven', '{}'::jsonb, now() - interval '31 days'),
  ('vcr_workflow_signal_4', 'unproven', '{}'::jsonb, now() - interval '31 days'),
  ('vcr_workflow_signal_10', 'unproven', '{}'::jsonb, now() - interval '31 days')
ON CONFLICT (schema_key) DO NOTHING;
