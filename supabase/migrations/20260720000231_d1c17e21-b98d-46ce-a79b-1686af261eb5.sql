-- Expand E5 to require S3, S5, S6, S8, S9 in addition to existing S1/S2/S4/S7/S10.
UPDATE public.qaqc_checks
SET sql = $qc$
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
$qc$,
    title = 'Workflow-signal eval coverage fresh & passing (S1-S10 deterministic)',
    updated_at = now()
WHERE id = 'E5';