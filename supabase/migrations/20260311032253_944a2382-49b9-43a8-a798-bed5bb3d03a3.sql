
-- Revert P2A plan from COMPLETED back to ACTIVE (submitted, awaiting approval)
UPDATE public.p2a_handover_plans
SET status = 'ACTIVE',
    updated_at = now()
WHERE id = '4bb9517f-2779-4414-b866-921230d56218';

-- Set ora_plan_activities to IN_PROGRESS at 95% (submitted but not fully approved)
UPDATE public.ora_plan_activities
SET status = 'IN_PROGRESS',
    completion_percentage = 95,
    updated_at = now()
WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8';

-- Fix user_tasks metadata to reflect submitted (ACTIVE) state
UPDATE public.user_tasks
SET metadata = jsonb_set(
      jsonb_set(
        metadata::jsonb,
        '{plan_status}', '"ACTIVE"'
      ),
      '{completion_percentage}', '95'
    ),
    updated_at = now()
WHERE id = '36efb9ea-1725-4a8d-a647-c8c85825301a';
