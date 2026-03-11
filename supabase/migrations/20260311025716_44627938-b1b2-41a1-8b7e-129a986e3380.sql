-- Revert the P2A handover plan to DRAFT since the task card is in "In Progress"
UPDATE public.p2a_handover_plans
SET status = 'DRAFT', updated_at = now()
WHERE id = '4bb9517f-2779-4414-b866-921230d56218'
  AND status = 'ACTIVE';

-- Set the ora_plan_activities P2A-01 row to 86% (draft completion cap)
UPDATE public.ora_plan_activities
SET completion_percentage = 86, status = 'IN_PROGRESS', updated_at = now()
WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8';

-- Fix the user_tasks metadata to reflect DRAFT status and 86% completion
UPDATE public.user_tasks
SET metadata = jsonb_set(
      jsonb_set(
        metadata::jsonb,
        '{plan_status}', '"DRAFT"'
      ),
      '{completion_percentage}', '86'
    ),
    updated_at = now()
WHERE id = '36efb9ea-1725-4a8d-a647-c8c85825301a';