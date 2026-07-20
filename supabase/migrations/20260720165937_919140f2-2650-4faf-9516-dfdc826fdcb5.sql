
UPDATE public.qaqc_checks
   SET sql = $qaqc$
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
    ('lolc')
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
$qaqc$,
       title = 'Eval coverage fresh & passing (S1-S10 signals + su_notification + lolc readers)'
 WHERE id = 'E5';

INSERT INTO public.vcr_item_insight_templates
  (vcr_item_id, engines, action_templates, config_version, suppress_category_agents)
VALUES
  ('96710eee-9115-4ddb-870e-085996826656',
   ARRAY['evidence_match','workflow_signals','currency_check','register_reader:lolc']::text[],
   '{}'::jsonb, 1, false),
  ('fb7993c4-f23b-4c4e-bbf8-25282fcaa42c',
   ARRAY['evidence_match','workflow_signals','currency_check','register_reader:lolc']::text[],
   '{}'::jsonb, 1, false)
ON CONFLICT (vcr_item_id) DO UPDATE
  SET engines = EXCLUDED.engines,
      config_version = public.vcr_item_insight_templates.config_version + 1,
      updated_at = now();
