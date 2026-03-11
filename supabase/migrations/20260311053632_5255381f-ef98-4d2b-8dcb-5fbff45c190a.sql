
-- Fix P2A state inconsistency: sync all tables to DRAFT state
-- p2a_handover_plans: ACTIVE → DRAFT
UPDATE p2a_handover_plans 
SET status = 'DRAFT', updated_at = now() 
WHERE id = '4bb9517f-2779-4414-b866-921230d56218' AND status = 'ACTIVE';

-- user_tasks metadata: set plan_status=DRAFT, completion_percentage=86
UPDATE user_tasks 
SET metadata = jsonb_set(
  jsonb_set(COALESCE(metadata::jsonb, '{}'::jsonb), '{plan_status}', '"DRAFT"'),
  '{completion_percentage}', '86'
),
updated_at = now()
WHERE id = '36efb9ea-1725-4a8d-a647-c8c85825301a';

-- ora_plan_activities: 71% → 86%
UPDATE ora_plan_activities 
SET completion_percentage = 86, updated_at = now() 
WHERE id = '8ba49008-f1e5-42ae-910b-6d9ee488f2c8';
