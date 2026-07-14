
-- 1) Extend checklist-bundle recompute to also sync sub_items[].completed
--    (previously only updated status/progress/counters; the JSON completed
--    flag was left stale, which is what B2 surfaced.)
CREATE OR REPLACE FUNCTION public._recompute_vcr_checklist_bundle_row(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub jsonb; v_meta jsonb;
  v_total int; v_submitted int; v_approved int;
  v_pct int; v_new_status text; v_new_sub jsonb;
BEGIN
  SELECT sub_items, metadata INTO v_sub, v_meta
    FROM public.user_tasks WHERE id = p_task_id;
  IF v_sub IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE p.status IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_REQUESTED','QUALIFICATION_APPROVED')),
    COUNT(*) FILTER (WHERE p.status IN ('ACCEPTED','QUALIFICATION_APPROVED'))
  INTO v_total, v_submitted, v_approved
  FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) AS item
  JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid;

  v_pct := CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_approved,0)::numeric / v_total) * 100) ELSE 0 END;

  IF v_total > 0 AND COALESCE(v_approved,0) >= v_total THEN
    v_new_status := 'completed';
  ELSIF COALESCE(v_submitted,0) > 0 THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Rebuild sub_items with completed flag derived from prereq status
  SELECT jsonb_agg(
    item || jsonb_build_object(
      'completed',
      COALESCE(p.status IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_REQUESTED','QUALIFICATION_APPROVED'), false)
    )
  ) INTO v_new_sub
  FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) AS item
  LEFT JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid;

  UPDATE public.user_tasks
     SET progress_percentage = v_pct,
         status = v_new_status,
         sub_items = COALESCE(v_new_sub, v_sub),
         metadata = COALESCE(v_meta,'{}'::jsonb) || jsonb_build_object(
           'delivering_total_items',     v_total,
           'delivering_submitted_items', COALESCE(v_submitted,0),
           'delivering_approved_items',  COALESCE(v_approved,0)
         ),
         updated_at = now()
   WHERE id = p_task_id;
END
$function$;

-- Rewire the trigger to delegate to the helper so both paths (trigger + manual
-- reconcile call) share one code path.
CREATE OR REPLACE FUNCTION public.recompute_vcr_checklist_bundle_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_task_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  FOR v_task_id IN
    SELECT ut.id
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_checklist_bundle'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = COALESCE(NEW.id, OLD.id)
      )
  LOOP
    PERFORM public._recompute_vcr_checklist_bundle_row(v_task_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END
$function$;

-- 2) One-time data repair via idempotent reconcilers (no hand-edits).
DO $$
BEGIN
  -- B2: sync OI-20 checklist bundle sub_items.completed
  PERFORM public._recompute_vcr_checklist_bundle_row('8f1b5ff0-472d-4f09-92e2-b3ded94b8274'::uuid);

  -- B3: re-stamp approval bundle counters
  PERFORM public._recompute_vcr_approval_bundle_row('1b137bb8-0078-473e-a35c-5932b4c1b181'::uuid);

  -- B1 SUPERSEDED test case (Lyle's VCR-02 bundle)
  PERFORM public._recompute_vcr_approval_bundle_row('37cb5d44-cf1f-4bd3-8894-d508db89e271'::uuid);
END $$;

-- 3) QAQC check-definition fixes (data update on qaqc_checks)
UPDATE public.qaqc_checks SET sql = $CHK$
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
   AND a.status::text IN ('ACCEPTED','REJECTED','QUALIFIED','QUALIFICATION_APPROVED','SUPERSEDED')
  GROUP BY e.task_id, e.reported
)
SELECT task_id, reported, actual FROM counts WHERE reported <> actual
$CHK$ WHERE id = 'B1';

UPDATE public.qaqc_checks SET sql = $CHK$
SELECT id, vcr_item_id, severity, jsonb_typeof(payload) AS payload_type
FROM public.vcr_item_insights
WHERE jsonb_typeof(payload) <> 'object'
   OR (severity IS NOT NULL AND severity NOT IN ('green','amber','red'))
$CHK$ WHERE id = 'I2';

UPDATE public.qaqc_checks SET sql = $CHK$
WITH pair AS (
  SELECT t.id AS task_id, lower(t.status) AS bundle_status,
         a.id AS activity_id, lower(a.status) AS activity_status
  FROM public.user_tasks t
  JOIN public.ora_plan_activities a
    ON a.source_ref_id = t.id OR a.source_ref_id = (t.metadata->>'vcr_id')::uuid
  WHERE t.type = 'vcr_checklist_bundle'
)
SELECT task_id, bundle_status, activity_id, activity_status
FROM pair
WHERE NOT (
  (bundle_status='pending'     AND activity_status='not_started')
  OR (bundle_status='in_progress' AND activity_status='in_progress')
  OR (bundle_status='completed'   AND activity_status='completed')
)
$CHK$ WHERE id = 'M2';

-- I3: vcr_insights_agent_config has no is_active column. Real intent:
-- flag insights whose category is not represented in the agent-config table
-- (i.e., insights produced for a suppressed / unmapped category).
UPDATE public.qaqc_checks SET sql = $CHK$
SELECT i.id, i.vcr_item_id, cat.code AS category_code
FROM public.vcr_item_insights i
JOIN public.vcr_items vi ON vi.id = i.vcr_item_id
LEFT JOIN public.vcr_item_categories cat ON cat.id = vi.category_id
LEFT JOIN public.vcr_insights_agent_config c ON c.category_code = cat.code
WHERE c.category_code IS NULL
$CHK$ WHERE id = 'I3';
