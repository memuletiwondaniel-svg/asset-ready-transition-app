-- Restore wizard_state for plan 2b88ecdf from audit log
-- The wizard_state was corrupted by review mode loading empty state and auto-saving
UPDATE orp_plans
SET wizard_state = (
  SELECT (metadata->>'old')::jsonb->'wizard_state'
  FROM orp_activity_log
  WHERE orp_plan_id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa'
    AND activity_type = 'UPDATE'
    AND created_at = '2026-03-06 07:39:09.785669+00'
  LIMIT 1
)
WHERE id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa';