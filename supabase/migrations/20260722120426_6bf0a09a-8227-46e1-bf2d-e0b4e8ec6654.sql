
-- EV1: legacy evidence_links denorm absent everywhere
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('EV1', 'EV', 'Legacy evidence_links column absent (denorm retired)',
 'Phase A retired the p2a_vcr_prerequisites.evidence_links JSONB denorm. Any resurfacing signals drift risk.',
 $sql$
 SELECT table_schema, table_name, column_name
   FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'evidence_links'
 $sql$,
 'error', true)
ON CONFLICT (id) DO UPDATE SET
  category=EXCLUDED.category, title=EXCLUDED.title, description=EXCLUDED.description,
  sql=EXCLUDED.sql, severity=EXCLUDED.severity, is_active=true;

-- EV2: every evidence row has a non-null evidence_kind
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('EV2', 'EV', 'Evidence rows carry evidence_kind (Phase B classifier)',
 'The Phase B normalize trigger classifies evidence_kind on insert/update. Any null indicates the trigger was bypassed.',
 $sql$
 SELECT id, file_name, source::text, evidence_kind
   FROM public.p2a_vcr_evidence
  WHERE evidence_kind IS NULL
 $sql$,
 'error', true)
ON CONFLICT (id) DO UPDATE SET
  category=EXCLUDED.category, title=EXCLUDED.title, description=EXCLUDED.description,
  sql=EXCLUDED.sql, severity=EXCLUDED.severity, is_active=true;

-- EV3: source='assai' rows carry an assai_doc_no
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('EV3', 'EV', 'Assai-sourced evidence rows carry assai_doc_no',
 'Phase B added the assai doc-number-match validation trigger. Any assai-sourced row missing assai_doc_no signals a trigger bypass.',
 $sql$
 SELECT id, file_name, source::text, assai_doc_no
   FROM public.p2a_vcr_evidence
  WHERE source = 'assai'::public.p2a_evidence_source
    AND (assai_doc_no IS NULL OR btrim(assai_doc_no) = '')
 $sql$,
 'error', true)
ON CONFLICT (id) DO UPDATE SET
  category=EXCLUDED.category, title=EXCLUDED.title, description=EXCLUDED.description,
  sql=EXCLUDED.sql, severity=EXCLUDED.severity, is_active=true;

-- EV4: promoted back-pointers resolve both ways
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('EV4', 'EV', 'Promoted back-pointers resolve both ways (attachment <-> evidence)',
 'For every attachment with a promoted_evidence_id, the evidence row must exist; for every source=promoted_* evidence row, exactly one attachment must point at it.',
 $sql$
 WITH att AS (
   SELECT 'procedure'::text kind, id att_id, promoted_evidence_id ev_id FROM public.p2a_vcr_procedure_attachments WHERE promoted_evidence_id IS NOT NULL
   UNION ALL
   SELECT 'training',       id, promoted_evidence_id FROM public.p2a_vcr_training_attachments WHERE promoted_evidence_id IS NOT NULL
   UNION ALL
   SELECT 'register',       id, promoted_evidence_id FROM public.p2a_vcr_register_attachments WHERE promoted_evidence_id IS NOT NULL
   UNION ALL
   SELECT 'maintenance',    id, promoted_evidence_id FROM public.p2a_vcr_maint_attachments   WHERE promoted_evidence_id IS NOT NULL
 ),
 forward_broken AS (
   SELECT a.kind, a.att_id::text ref, a.ev_id::text evidence_id, 'attachment_points_at_missing_evidence' problem
     FROM att a
     LEFT JOIN public.p2a_vcr_evidence e ON e.id = a.ev_id
    WHERE e.id IS NULL
 ),
 reverse_broken AS (
   SELECT 'evidence'::text kind, e.id::text ref, e.source::text evidence_id,
          CASE WHEN cnt = 0 THEN 'promoted_evidence_has_no_back_pointer'
               ELSE 'promoted_evidence_has_multiple_back_pointers' END problem
     FROM public.p2a_vcr_evidence e
     LEFT JOIN LATERAL (
       SELECT count(*)::int cnt FROM att a WHERE a.ev_id = e.id
     ) x ON true
    WHERE e.source::text LIKE 'promoted_%'
      AND cnt <> 1
 )
 SELECT * FROM forward_broken
 UNION ALL
 SELECT * FROM reverse_broken
 $sql$,
 'error', true)
ON CONFLICT (id) DO UPDATE SET
  category=EXCLUDED.category, title=EXCLUDED.title, description=EXCLUDED.description,
  sql=EXCLUDED.sql, severity=EXCLUDED.severity, is_active=true;

-- EV5: evidence_match_cache FK integrity (no dangling verdicts)
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('EV5', 'EV', 'evidence_match_cache references live evidence rows',
 'Cached E1 verdicts must always resolve to a real p2a_vcr_evidence row; a dangling cache row would silently persist a stale verdict.',
 $sql$
 SELECT c.id, c.evidence_id, c.verdict
   FROM public.evidence_match_cache c
   LEFT JOIN public.p2a_vcr_evidence e ON e.id = c.evidence_id
  WHERE e.id IS NULL
 $sql$,
 'error', true)
ON CONFLICT (id) DO UPDATE SET
  category=EXCLUDED.category, title=EXCLUDED.title, description=EXCLUDED.description,
  sql=EXCLUDED.sql, severity=EXCLUDED.severity, is_active=true;

-- Update E5 to include the new vcr_evidence_promotion_v1 slot (15 total)
UPDATE public.qaqc_checks SET
  title = 'Eval coverage fresh & passing (S1-S10 signals + su_notification + lolc + audit_actions + punchlist + evidence_promotion)',
  sql = $sql$
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
    ('punchlist'),
    ('vcr_evidence_promotion_v1')
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
$sql$
WHERE id = 'E5';
