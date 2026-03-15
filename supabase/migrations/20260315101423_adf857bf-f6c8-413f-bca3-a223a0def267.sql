-- Clean up orphaned reviewer tasks for source task d9964aff that was already moved back to in_progress
DELETE FROM user_tasks
WHERE type = 'review'
  AND metadata->>'source' = 'task_review'
  AND metadata->>'source_task_id' = 'd9964aff-588b-410f-afad-e2c5ebec5761';

-- Reset task_reviewers to PENDING for that task
UPDATE task_reviewers
SET status = 'PENDING', decided_at = NULL, comments = NULL
WHERE task_id = 'd9964aff-588b-410f-afad-e2c5ebec5761';