UPDATE public.qaqc_checks SET sql = $q$
SELECT 'vcr_workflow_signal_7'::text AS schema_key,
       COALESCE(s.eval_status, 'missing') AS eval_status,
       s.updated_at
  FROM (SELECT 1) x
  LEFT JOIN public.insight_schema_status s
    ON s.schema_key = 'vcr_workflow_signal_7'
 WHERE s.schema_key IS NULL
    OR s.eval_status <> 'passed'
    OR s.updated_at < now() - interval '30 days'
$q$ WHERE id = 'E5';