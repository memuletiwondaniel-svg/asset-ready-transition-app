-- IIF Phase 3B — Punchlist RegisterReader wiring
-- 1) Extend E5 eval-coverage QAQC check to require the punchlist slot (14 total).
-- 2) Wire the TI Scope item (Construction & Commissioning punchlist area) to
--    the register_reader:punchlist engine.
-- 3) Seed insight_schema_status row for `punchlist` (unproven — flips to
--    passed after the eval harness runs against the seeded synthetic fixtures).

-- (1) E5
UPDATE public.qaqc_checks
   SET sql = $QAQC$
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
    ('audit_actions'),
    ('punchlist')
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
$QAQC$,
       title = 'Eval coverage fresh & passing (S1-S10 signals + su_notification + lolc + audit_actions + punchlist readers)',
       updated_at = now()
 WHERE id = 'E5';

-- (2) Wire TI Scope item (0d84ffe2 — "Have all Construction and Commissioning
-- scopes been completed, verified, and accepted, with no outstanding works…"
-- topic=Scope) to register_reader:punchlist. Additive to defaults.
INSERT INTO public.vcr_item_insight_templates (vcr_item_id, engines, config_version, updated_at)
VALUES (
  '0d84ffe2-4c54-4645-b744-ede9ad5151ff',
  ARRAY['evidence_match','workflow_signals','currency_check','register_reader:punchlist']::text[],
  1,
  now()
)
ON CONFLICT (vcr_item_id) DO UPDATE
  SET engines = ARRAY(SELECT DISTINCT unnest(
        COALESCE(public.vcr_item_insight_templates.engines, ARRAY[]::text[]) ||
        ARRAY['register_reader:punchlist']::text[]
      )),
      config_version = COALESCE(public.vcr_item_insight_templates.config_version, 0) + 1,
      updated_at = now();

-- (3) Seed status as unproven until eval harness flips it (schema-aware gate
-- in compute-vcr-insights appends "(unvalidated reader)" until then).
INSERT INTO public.insight_schema_status (schema_key, eval_status, note, updated_at)
VALUES ('punchlist', 'unproven', 'seeded — pending eval harness run against synthetic fixtures', now())
ON CONFLICT (schema_key) DO NOTHING;
