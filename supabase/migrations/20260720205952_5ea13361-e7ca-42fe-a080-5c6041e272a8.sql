
UPDATE public.qaqc_checks
   SET title = 'Eval coverage fresh & passing (S1-S10 signals + su_notification + lolc + audit_actions readers)',
       sql = $qaqc$
WITH expected(schema_key) AS (
  VALUES
    ('vcr_workflow_signal_1'),
    ('vcr_workflow_signal_2'),
    ('vcr_workflow_signal_3'),
    ('vcr_workflow_signal_4'),
    ('vcr_workflow_signal_5'),
    ('vcr_workflow_signal_6'),
    ('vcr_workflow_signal_7'),
    ('vcr_workflow_signal_8'),
    ('vcr_workflow_signal_9'),
    ('vcr_workflow_signal_10'),
    ('su_notification'),
    ('lolc'),
    ('audit_actions')
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
$qaqc$
 WHERE id = 'E5';

INSERT INTO public.vcr_item_insight_templates (vcr_item_id, engines, register_schema)
VALUES (
  'bba33674-d8b6-44c2-a2b1-2fa73eb0ec41',
  ARRAY['register_reader:audit_actions']::text[],
  '"audit_actions"'::jsonb
)
ON CONFLICT (vcr_item_id) DO UPDATE
  SET engines = EXCLUDED.engines,
      register_schema = EXCLUDED.register_schema;
