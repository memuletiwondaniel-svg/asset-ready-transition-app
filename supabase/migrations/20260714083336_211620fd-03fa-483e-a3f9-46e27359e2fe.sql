
-- ============ TABLES ============
CREATE TABLE public.qaqc_checks (
  id text PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  sql text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qaqc_checks TO authenticated;
GRANT ALL ON public.qaqc_checks TO service_role;
ALTER TABLE public.qaqc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qaqc_checks read all authenticated" ON public.qaqc_checks
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.qaqc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_checks int NOT NULL DEFAULT 0,
  passed int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  errored int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qaqc_runs TO authenticated;
GRANT ALL ON public.qaqc_runs TO service_role;
ALTER TABLE public.qaqc_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qaqc_runs read all authenticated" ON public.qaqc_runs
  FOR SELECT TO authenticated USING (true);

-- ============ RUNNER HELPER (read-only guard) ============
-- Runs one check SQL inside a subtransaction with transaction_read_only=on.
-- Any DML/DDL in the check SQL raises "cannot execute ... in a read-only
-- transaction", which we capture as errored=true. Returns:
--   { failing_count int, samples jsonb, error text|null, duration_ms int }
CREATE OR REPLACE FUNCTION public.qaqc_run_check(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_samples jsonb := '[]'::jsonb;
  v_err text := NULL;
  v_start timestamptz := clock_timestamp();
  v_dur int;
BEGIN
  BEGIN
    -- Force read-only inside this block
    PERFORM set_config('transaction_read_only', 'on', true);
    -- Run the check and capture up to 3 offending rows as jsonb
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb), COUNT(*)::int FROM ( %s ) t',
      'SELECT * FROM (' || p_sql || ') sub LIMIT 3'
    ) INTO v_samples, v_count;
    -- Get real total (not capped at 3)
    EXECUTE format('SELECT COUNT(*)::int FROM ( %s ) t', p_sql) INTO v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    v_samples := '[]'::jsonb;
    v_count := 0;
  END;
  v_dur := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000)::int;
  RETURN jsonb_build_object(
    'failing_count', v_count,
    'samples', v_samples,
    'error', v_err,
    'duration_ms', v_dur
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.qaqc_run_check(text) TO service_role;

-- ============ SEED CHECKS ============
INSERT INTO public.qaqc_checks (id, category, title, description, severity, sql) VALUES

-- L1: Every prereq in READY_FOR_REVIEW must have at least one ledger row
('L1','ledger','Submitted prereq has ledger seeded',
 'READY_FOR_REVIEW prereqs must have >=1 vcr_prerequisite_approvals row.',
 'error',
$SQL$
SELECT p.id AS prerequisite_id, p.summary, p.status
FROM public.p2a_vcr_prerequisites p
WHERE p.status::text = 'READY_FOR_REVIEW'
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals a WHERE a.prerequisite_id = p.id
  )
$SQL$),

-- L2: Ledger status/decided_at consistency
('L2','ledger','Ledger status vs decided_at consistency',
 'A decided status must have decided_at; PENDING must have decided_at NULL.',
 'error',
$SQL$
SELECT id, prerequisite_id, status::text, decided_at
FROM public.vcr_prerequisite_approvals
WHERE (status::text IN ('ACCEPTED','REJECTED','QUALIFIED','QUALIFICATION_APPROVED','SUPERSEDED') AND decided_at IS NULL)
   OR (status::text = 'PENDING' AND decided_at IS NOT NULL)
$SQL$),

-- L3: Terminal ACCEPTED prereq should have at least one ACCEPTED ledger row
('L3','ledger','ACCEPTED prereq has ACCEPTED ledger',
 'p2a_vcr_prerequisites.status=ACCEPTED implies >=1 ACCEPTED ledger row (else pre-ledger legacy).',
 'warning',
$SQL$
SELECT p.id AS prerequisite_id, p.summary, p.reviewed_at
FROM public.p2a_vcr_prerequisites p
WHERE p.status::text = 'ACCEPTED'
  AND EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals a WHERE a.prerequisite_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals a
    WHERE a.prerequisite_id = p.id AND a.status::text = 'ACCEPTED'
  )
$SQL$),

-- L4: SUPERSEDED rows must have a decided partner in same (prereq, role)
('L4','ledger','SUPERSEDED has decided partner',
 'A SUPERSEDED ledger row must have another decided row for the same (prereq, approver_role_id).',
 'error',
$SQL$
SELECT s.id, s.prerequisite_id, s.approver_role_id, s.approver_user_id
FROM public.vcr_prerequisite_approvals s
WHERE s.status::text = 'SUPERSEDED'
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals p
    WHERE p.prerequisite_id = s.prerequisite_id
      AND p.approver_role_id = s.approver_role_id
      AND p.id <> s.id
      AND p.status::text IN ('ACCEPTED','REJECTED','QUALIFIED','QUALIFICATION_APPROVED')
  )
$SQL$),

-- B1: Approval-bundle decided counter matches ledger reality (per bundle owner)
('B1','bundle','Approval bundle approver_decided_items matches ledger',
 'user_tasks.type=vcr_approval_bundle metadata.approver_decided_items should equal COUNT of that owner''s decided ledger rows across the bundle sub_items.',
 'error',
$SQL$
WITH bundles AS (
  SELECT t.id, t.user_id, t.sub_items, t.metadata,
         COALESCE((t.metadata->>'approver_decided_items')::int, 0) AS reported
  FROM public.user_tasks t
  WHERE t.type = 'vcr_approval_bundle' AND t.status <> 'completed'
),
expanded AS (
  SELECT b.id AS task_id, b.user_id, b.reported,
         (si->>'prerequisite_id')::uuid AS prereq_id
  FROM bundles b, jsonb_array_elements(COALESCE(b.sub_items,'[]'::jsonb)) si
  WHERE (si->>'prerequisite_id') IS NOT NULL
),
counts AS (
  SELECT e.task_id, e.reported, COUNT(a.id)::int AS actual
  FROM expanded e
  LEFT JOIN public.vcr_prerequisite_approvals a
    ON a.prerequisite_id = e.prereq_id
   AND a.approver_user_id = e.user_id
   AND a.status::text IN ('ACCEPTED','REJECTED','QUALIFIED','QUALIFICATION_APPROVED')
  GROUP BY e.task_id, e.reported
)
SELECT task_id, reported, actual FROM counts WHERE reported <> actual
$SQL$),

-- B2: Checklist-bundle sub_items[].completed matches prereq status mapping
('B2','bundle','Checklist bundle sub_items.completed matches prereq status',
 'For vcr_checklist_bundle, sub_items[].completed=true iff prereq.status IN (READY_FOR_REVIEW,ACCEPTED,QUALIFICATION_APPROVED).',
 'error',
$SQL$
WITH ex AS (
  SELECT t.id AS task_id,
         (si->>'prerequisite_id')::uuid AS prereq_id,
         COALESCE((si->>'completed')::boolean, false) AS reported_completed
  FROM public.user_tasks t, jsonb_array_elements(COALESCE(t.sub_items,'[]'::jsonb)) si
  WHERE t.type = 'vcr_checklist_bundle' AND t.status <> 'completed'
    AND (si->>'prerequisite_id') IS NOT NULL
)
SELECT ex.task_id, ex.prereq_id, ex.reported_completed, p.status::text AS prereq_status
FROM ex JOIN public.p2a_vcr_prerequisites p ON p.id = ex.prereq_id
WHERE ex.reported_completed <> (p.status::text IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_APPROVED'))
$SQL$),

-- B3: progress_percentage consistent with sub_items completion ratio
('B3','bundle','Bundle progress_percentage consistent with sub_items',
 'progress_percentage should equal round(100 * completed / total) within 1pt for VCR bundles.',
 'warning',
$SQL$
WITH agg AS (
  SELECT t.id AS task_id, t.type, t.progress_percentage,
         COUNT(*) FILTER (WHERE COALESCE((si->>'completed')::boolean,false)) AS done,
         COUNT(*) AS total
  FROM public.user_tasks t, jsonb_array_elements(COALESCE(t.sub_items,'[]'::jsonb)) si
  WHERE t.type IN ('vcr_checklist_bundle','vcr_approval_bundle') AND t.status <> 'completed'
  GROUP BY t.id, t.type, t.progress_percentage
)
SELECT task_id, type, progress_percentage, done, total,
       CASE WHEN total=0 THEN 0 ELSE (100*done/total) END AS expected
FROM agg
WHERE total > 0 AND ABS(COALESCE(progress_percentage,0) - (100*done/total)) > 1
$SQL$),

-- B4: no live bundle references a missing prereq
('B4','bundle','Bundle sub_items reference existing prereqs',
 'Every sub_items[].prerequisite_id in a live bundle must exist in p2a_vcr_prerequisites.',
 'error',
$SQL$
SELECT t.id AS task_id, (si->>'prerequisite_id')::uuid AS missing_prereq_id
FROM public.user_tasks t, jsonb_array_elements(COALESCE(t.sub_items,'[]'::jsonb)) si
WHERE t.type IN ('vcr_checklist_bundle','vcr_approval_bundle')
  AND t.status <> 'completed'
  AND (si->>'prerequisite_id') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.p2a_vcr_prerequisites p WHERE p.id = (si->>'prerequisite_id')::uuid)
$SQL$),

-- M1: every live checklist bundle maps to exactly one ORA mirror
('M1','mirror','Checklist bundle mirrored to exactly one ORA activity',
 'Each vcr_checklist_bundle should have exactly one ora_plan_activities row keyed by (source_type=vcr_checklist_bundle, source_ref_id=task.id) OR metadata.vcr_id fallback.',
 'warning',
$SQL$
WITH b AS (
  SELECT t.id AS task_id, (t.metadata->>'vcr_id')::uuid AS vcr_id
  FROM public.user_tasks t
  WHERE t.type = 'vcr_checklist_bundle' AND t.status <> 'completed'
),
m AS (
  SELECT b.task_id, b.vcr_id,
    (SELECT COUNT(*) FROM public.ora_plan_activities a
     WHERE (a.source_ref_id = b.task_id)
        OR (a.source_ref_id = b.vcr_id)) AS mirror_count
  FROM b
)
SELECT task_id, vcr_id, mirror_count FROM m WHERE mirror_count <> 1
$SQL$),

-- M2: mirrored activity status maps to bundle status
('M2','mirror','Mirror activity status matches bundle status',
 'ora_plan_activities.status should reflect the paired bundle status (not_started/in_progress/completed).',
 'warning',
$SQL$
WITH pair AS (
  SELECT t.id AS task_id, t.status AS bundle_status, a.id AS activity_id, a.status AS activity_status
  FROM public.user_tasks t
  JOIN public.ora_plan_activities a
    ON a.source_ref_id = t.id OR a.source_ref_id = (t.metadata->>'vcr_id')::uuid
  WHERE t.type = 'vcr_checklist_bundle'
)
SELECT task_id, bundle_status, activity_id, activity_status
FROM pair
WHERE NOT (
  (bundle_status='not_started' AND activity_status IN ('not_started','pending'))
  OR (bundle_status='in_progress' AND activity_status IN ('in_progress','active'))
  OR (bundle_status='completed' AND activity_status IN ('completed','done'))
)
$SQL$),

-- T1: no open tasks assigned to inactive users
('T1','tasks','No open tasks for inactive users',
 'user_tasks.status <> completed but profiles.is_active=false or account_status=disabled.',
 'error',
$SQL$
SELECT t.id, t.user_id, t.type, t.title, pr.is_active, pr.account_status
FROM public.user_tasks t
JOIN public.profiles pr ON pr.user_id = t.user_id
WHERE t.status <> 'completed'
  AND (COALESCE(pr.is_active,true) = false OR pr.account_status = 'disabled')
$SQL$),

-- T2: dedupe_key uniqueness where defined
('T2','tasks','dedupe_key uniqueness',
 'Duplicate open (user_id, dedupe_key) pairs in user_tasks.',
 'error',
$SQL$
SELECT user_id, dedupe_key, COUNT(*) AS n
FROM public.user_tasks
WHERE dedupe_key IS NOT NULL AND status <> 'completed'
GROUP BY user_id, dedupe_key
HAVING COUNT(*) > 1
$SQL$),

-- P1: READY_FOR_REVIEW prereq has evidence
('P1','prereq','READY_FOR_REVIEW has evidence',
 'A submitted prereq should have evidence_links non-empty.',
 'warning',
$SQL$
SELECT id, summary, status::text
FROM public.p2a_vcr_prerequisites
WHERE status::text = 'READY_FOR_REVIEW'
  AND (evidence_links IS NULL
       OR jsonb_typeof(evidence_links) <> 'array'
       OR jsonb_array_length(evidence_links) = 0)
$SQL$),

-- P2: no orphan vcr_item_comments
('P2','prereq','No orphan vcr_item_comments',
 'Every comment must reference an existing vcr_item or handover_point.',
 'error',
$SQL$
SELECT c.id, c.vcr_item_id, c.handover_point_id
FROM public.vcr_item_comments c
WHERE (c.vcr_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.p2a_vcr_prerequisites p WHERE p.vcr_item_id = c.vcr_item_id))
   OR (c.vcr_item_id IS NULL AND c.handover_point_id IS NULL)
$SQL$),

-- P3: REJECTED prereq implies a return-reason comment
('P3','prereq','REJECTED prereq has a return-reason comment',
 'A prereq with a REJECTED ledger row should have at least one vcr_item_comments row with action_tag ilike %return% or %reject%.',
 'warning',
$SQL$
WITH rejected AS (
  SELECT DISTINCT a.prerequisite_id, p.vcr_item_id, p.handover_point_id
  FROM public.vcr_prerequisite_approvals a
  JOIN public.p2a_vcr_prerequisites p ON p.id = a.prerequisite_id
  WHERE a.status::text = 'REJECTED'
)
SELECT r.prerequisite_id, r.vcr_item_id
FROM rejected r
WHERE NOT EXISTS (
  SELECT 1 FROM public.vcr_item_comments c
  WHERE (c.vcr_item_id = r.vcr_item_id OR c.handover_point_id = r.handover_point_id)
    AND (COALESCE(c.action_tag,'') ILIKE '%return%' OR COALESCE(c.action_tag,'') ILIKE '%reject%')
)
$SQL$),

-- I1: insight staleness vs prereq status change
('I1','insight','Insight fresher than prereq last change',
 'vcr_item_insights.computed_at should be >= paired prereq.updated_at (else stale).',
 'warning',
$SQL$
SELECT i.id, i.vcr_item_id, i.computed_at, p.updated_at
FROM public.vcr_item_insights i
JOIN public.p2a_vcr_prerequisites p ON p.vcr_item_id = i.vcr_item_id
WHERE i.computed_at < p.updated_at
$SQL$),

-- I2: insight payload schema valid (must be object with severity + at least one signal)
('I2','insight','Insight payload schema valid',
 'payload must be a JSON object; severity must be one of info/warning/error/critical.',
 'error',
$SQL$
SELECT id, vcr_item_id, severity, jsonb_typeof(payload) AS payload_type
FROM public.vcr_item_insights
WHERE jsonb_typeof(payload) <> 'object'
   OR severity NOT IN ('info','warning','error','critical')
$SQL$),

-- I3: suppressed category agents actually suppressed
('I3','insight','Suppressed insight agents produce no rows',
 'vcr_insights_agent_config with is_active=false should have no rows in vcr_item_insights with origin matching agent key computed today.',
 'warning',
$SQL$
SELECT i.id, i.origin, i.computed_at
FROM public.vcr_item_insights i
JOIN public.vcr_insights_agent_config c ON c.agent_key = i.origin
WHERE c.is_active = false
  AND i.computed_at > now() - interval '1 day'
$SQL$);
