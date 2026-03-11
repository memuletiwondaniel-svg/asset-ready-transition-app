
-- Move the P2A task to Done: set user_tasks status to completed
UPDATE public.user_tasks
SET status = 'completed',
    metadata = jsonb_set(
      jsonb_set(
        metadata::jsonb,
        '{plan_status}', '"COMPLETED"'
      ),
      '{completion_percentage}', '100'
    ),
    updated_at = now()
WHERE id = '36efb9ea-1725-4a8d-a647-c8c85825301a';

-- Update ora_plan_activities to COMPLETED / 100%
UPDATE public.ora_plan_activities
SET status = 'COMPLETED',
    completion_percentage = 100,
    updated_at = now()
WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8';

-- Update p2a_handover_plans to COMPLETED (fully approved)
UPDATE public.p2a_handover_plans
SET status = 'COMPLETED',
    updated_at = now()
WHERE id = '4bb9517f-2779-4414-b866-921230d56218';
