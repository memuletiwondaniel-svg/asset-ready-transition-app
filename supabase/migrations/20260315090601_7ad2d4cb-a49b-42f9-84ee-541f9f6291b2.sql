-- Clean up stale data for "Competence Development & Assurance Plan" (task in_progress, no approvals should exist)

-- 1. Delete review tasks assigned to Ewan and Daniel
DELETE FROM user_tasks WHERE id IN ('a188724e-44f2-444f-882c-6eb9b9d37b17', 'c3bdb720-ba98-4fa8-af44-5581020edc76');

-- 2. Reset reviewer statuses to PENDING (they haven't been asked to review yet since task is in_progress)
UPDATE task_reviewers SET status = 'PENDING', decided_at = NULL, comments = NULL
WHERE task_id = 'd9964aff-588b-410f-afad-e2c5ebec5761';

-- 3. Clear all task_comments for this task (stale approval/void entries)
DELETE FROM task_comments WHERE task_id = 'd9964aff-588b-410f-afad-e2c5ebec5761';

-- 4. Clear all ora_activity_comments for this activity (stale status/approval entries)
DELETE FROM ora_activity_comments WHERE ora_plan_activity_id = 'b11bef29-5783-4c0d-89fa-7bf07d0df020';