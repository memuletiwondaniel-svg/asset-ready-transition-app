-- Fix the P2A activity: change code from P2A-01 to EXE-10 and set completion to 86%
UPDATE public.ora_plan_activities
SET activity_code = 'EXE-10',
    completion_percentage = 86,
    status = 'IN_PROGRESS',
    updated_at = now()
WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8';

-- Also update the wizard_state to reflect EXE-10 code
UPDATE public.orp_plans
SET wizard_state = jsonb_set(
  wizard_state,
  '{activities}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'activityCode' = 'P2A-01' OR elem->>'activity_code' = 'P2A-01'
        THEN elem || '{"activityCode": "EXE-10", "activity_code": "EXE-10"}'::jsonb
        ELSE elem
      END
    )
    FROM jsonb_array_elements(wizard_state->'activities') AS elem
  )
)
WHERE id IN (
  SELECT orp_plan_id FROM public.ora_plan_activities WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8'
)
AND wizard_state->'activities' IS NOT NULL;

-- Also ensure p2a_handover_plans is DRAFT
UPDATE public.p2a_handover_plans
SET status = 'DRAFT', updated_at = now()
WHERE id = '4bb9517f-2779-4414-b866-921230d56218'
  AND status != 'DRAFT';

-- Fix user_tasks metadata
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