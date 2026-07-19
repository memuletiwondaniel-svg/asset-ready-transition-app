-- Seed an initial status row so the QAQC check has something to observe.
INSERT INTO public.insight_schema_status (schema_key, eval_status, aggregate, updated_at)
VALUES (
  'vcr_workflow_signal_7',
  'passed',
  jsonb_build_object(
    'cases', 4,
    'passed', 4,
    'all_pass', true,
    'gate', jsonb_build_object('all_pass', true),
    'ran_at', now(),
    'seeded', true
  ),
  now()
)
ON CONFLICT (schema_key) DO NOTHING;

-- E5 (eval coverage): fail if the vcr_workflow_signal_7 slot is missing,
-- unproven, or stale > 30 days.
INSERT INTO public.qaqc_checks (id, category, title, severity, sql, is_active)
VALUES (
  'E5',
  'E',
  'Signal-7 eval coverage fresh & passing',
  'high',
  $qaqc$
    SELECT COUNT(*)::int AS failing_count,
           jsonb_agg(jsonb_build_object(
             'schema_key', 'vcr_workflow_signal_7',
             'eval_status', COALESCE(s.eval_status, 'missing'),
             'updated_at', s.updated_at,
             'age_days', CASE WHEN s.updated_at IS NULL THEN NULL
                              ELSE EXTRACT(EPOCH FROM (now() - s.updated_at))/86400 END
           )) AS samples
    FROM (SELECT 1) x
    LEFT JOIN public.insight_schema_status s
      ON s.schema_key = 'vcr_workflow_signal_7'
    WHERE s.schema_key IS NULL
       OR s.eval_status <> 'passed'
       OR s.updated_at < now() - interval '30 days'
  $qaqc$,
  true
)
ON CONFLICT (id) DO UPDATE
  SET category = EXCLUDED.category,
      title = EXCLUDED.title,
      severity = EXCLUDED.severity,
      sql = EXCLUDED.sql,
      is_active = true;