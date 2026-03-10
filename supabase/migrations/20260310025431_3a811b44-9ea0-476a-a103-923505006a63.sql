-- Fix existing P2A activity: update status to COMPLETED and link to the user task

-- 1. Update the ORA activity to COMPLETED with 100%
UPDATE ora_plan_activities 
SET status = 'COMPLETED', 
    completion_percentage = 100,
    end_date = CURRENT_DATE
WHERE id = 'c594c5df-8d7a-4e0c-94a4-f40791b875fa';

-- 2. Link the activity to its user task
UPDATE ora_plan_activities 
SET task_id = 'd276bc99-4518-4e3f-9300-81ad342c02c2'
WHERE id = 'c594c5df-8d7a-4e0c-94a4-f40791b875fa';

-- 3. Add ora_plan_activity_id to the task metadata for bidirectional linkage
UPDATE user_tasks 
SET metadata = metadata || jsonb_build_object(
    'ora_plan_activity_id', 'c594c5df-8d7a-4e0c-94a4-f40791b875fa',
    'activity_code', 'EXE-10'
)
WHERE id = 'd276bc99-4518-4e3f-9300-81ad342c02c2';