
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trg_kick_vcr_insights_on_prereq_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url text := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/compute-vcr-insights';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM';
BEGIN
  IF NEW.handover_point_id IS NULL OR NEW.vcr_item_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
      body := jsonb_build_object('vcr_id', NEW.handover_point_id, 'vcr_item_id', NEW.vcr_item_id, 'force', false)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'compute-vcr-insights kick failed for prereq %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kick_vcr_insights_on_prereq_status ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_kick_vcr_insights_on_prereq_status
AFTER UPDATE OF status ON public.p2a_vcr_prerequisites
FOR EACH ROW EXECUTE FUNCTION public.trg_kick_vcr_insights_on_prereq_status();

-- Backfill stale insights (I1).
DO $$
DECLARE
  r RECORD;
  v_url  text := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/compute-vcr-insights';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM';
  v_fired int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT i.vcr_id, i.vcr_item_id
    FROM public.vcr_item_insights i
    JOIN public.p2a_vcr_prerequisites p
      ON p.handover_point_id = i.vcr_id AND p.vcr_item_id = i.vcr_item_id
    WHERE i.computed_at < p.updated_at
  LOOP
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
      body := jsonb_build_object('vcr_id', r.vcr_id, 'vcr_item_id', r.vcr_item_id, 'force', true)
    );
    v_fired := v_fired + 1;
  END LOOP;
  RAISE NOTICE 'insight backfill kicked % pairs', v_fired;
END $$;

-- B5 QAQC check
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active)
VALUES (
  'B5',
  'bundle',
  'Approval bundle approver_awaiting_items matches ledger',
  'metadata.approver_awaiting_items on live vcr_approval_bundle tasks must equal COUNT of that approver PENDING ledger rows whose prereq is READY_FOR_REVIEW or QUALIFICATION_REQUESTED.',
  $qq$
    WITH bundles AS (
      SELECT ut.id AS task_id, ut.user_id AS approver_user_id,
             COALESCE((ut.metadata->>'approver_awaiting_items')::int,0) AS reported,
             ut.sub_items
      FROM public.user_tasks ut
      WHERE ut.type = 'vcr_approval_bundle' AND ut.status <> 'completed'
    ),
    expanded AS (
      SELECT b.task_id, b.approver_user_id, b.reported,
             (elem->>'prerequisite_id')::uuid AS prerequisite_id
      FROM bundles b
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b.sub_items,'[]'::jsonb)) elem
      WHERE elem->>'prerequisite_id' IS NOT NULL
    ),
    computed AS (
      SELECT e.task_id, e.approver_user_id, e.reported,
             COUNT(*) FILTER (WHERE vpa.status='PENDING' AND p.status IN ('READY_FOR_REVIEW','QUALIFICATION_REQUESTED'))::int AS actual
      FROM expanded e
      JOIN public.p2a_vcr_prerequisites p ON p.id = e.prerequisite_id
      LEFT JOIN public.vcr_prerequisite_approvals vpa
        ON vpa.prerequisite_id = e.prerequisite_id AND vpa.approver_user_id = e.approver_user_id
      GROUP BY e.task_id, e.approver_user_id, e.reported
    )
    SELECT task_id, approver_user_id, reported, actual
    FROM computed WHERE reported <> actual
  $qq$,
  'error',
  true
)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sql = EXCLUDED.sql,
  severity = EXCLUDED.severity,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Backfill approval bundle counters
DO $$
DECLARE r RECORD; v_n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.user_tasks WHERE type='vcr_approval_bundle' AND status<>'completed' LOOP
    PERFORM public._recompute_vcr_approval_bundle_row(r.id);
    v_n := v_n + 1;
  END LOOP;
  RAISE NOTICE 'approval bundle backfill: recomputed % rows', v_n;
END $$;
