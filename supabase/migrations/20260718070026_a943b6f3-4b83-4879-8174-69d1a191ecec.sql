
-- ============================================================
-- B-mig-1: Task Management consolidation + legacy retirement
-- ============================================================

-- (1) Consolidate ORA-plan-review onto a single type
UPDATE public.user_tasks
SET type = 'ora_plan_review',
    metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
      'legacy_type','approval',
      'consolidated_at', now()
    ),
    updated_at = now()
WHERE type = 'approval'
  AND metadata->>'action' = 'review_ora_plan';

-- (2) Retire legacy client-generator rows still open
--     (P2APlanCreationWizard approvals + CreatePSSRWizard reviews)
--     Triggers own these lifecycles now — cancel, don't delete.
UPDATE public.user_tasks
SET status = 'cancelled_superseded',
    metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
      'cancelled_reason','legacy_client_generator_retired',
      'cancelled_at', now()
    ),
    updated_at = now()
WHERE type = 'approval'
  AND status IN ('pending','in_progress')
  AND (metadata->>'action' IS NULL OR metadata->>'action' = 'review_p2a_plan');

-- (3) Promote vcr_plan_resubmit into task/develop_vcr_plan
UPDATE public.user_tasks
SET type = 'task',
    metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
      'action','develop_vcr_plan',
      'is_resubmit', true,
      'legacy_type','vcr_plan_resubmit',
      'promoted_at', now()
    ),
    updated_at = now()
WHERE type = 'vcr_plan_resubmit';

-- ============================================================
-- QAQC — tasks family extensions
-- ============================================================

INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active)
VALUES
  ('X1', 'tasks',
   'ORA-plan-review consolidated to single type',
   'No task with type=approval + action=review_ora_plan should remain; all should live under type=ora_plan_review.',
   $$SELECT id, type, status, metadata->>'action' AS action
     FROM public.user_tasks
     WHERE type = 'approval'
       AND metadata->>'action' = 'review_ora_plan'$$,
   'error', true),

  ('X2', 'tasks',
   'Legacy P2A-plan approval generator retired',
   'No open (pending/in_progress) approval rows for review_p2a_plan action; triggers own this fan-out.',
   $$SELECT id, status, metadata->>'action' AS action
     FROM public.user_tasks
     WHERE type = 'approval'
       AND status IN ('pending','in_progress')
       AND metadata->>'action' = 'review_p2a_plan'$$,
   'error', true),

  ('X3', 'tasks',
   'Legacy no-action approval rows retired',
   'No open approval rows without metadata.action remain; those were legacy client-inserted PSSR/plan approvals.',
   $$SELECT id, status, title
     FROM public.user_tasks
     WHERE type = 'approval'
       AND status IN ('pending','in_progress')
       AND metadata->>'action' IS NULL$$,
   'error', true),

  ('X4', 'tasks',
   'vcr_plan_resubmit promoted to develop_vcr_plan',
   'No rows should retain the legacy type=vcr_plan_resubmit; those flow through type=task action=develop_vcr_plan with is_resubmit=true.',
   $$SELECT id, status FROM public.user_tasks WHERE type = 'vcr_plan_resubmit'$$,
   'error', true)
ON CONFLICT (id) DO UPDATE
  SET category = EXCLUDED.category,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sql = EXCLUDED.sql,
      severity = EXCLUDED.severity,
      is_active = EXCLUDED.is_active,
      updated_at = now();
