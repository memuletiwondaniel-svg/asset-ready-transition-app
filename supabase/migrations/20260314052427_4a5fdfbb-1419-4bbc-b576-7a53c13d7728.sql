
-- Backfill: create user_tasks for existing task_reviewers that don't have corresponding review tasks
INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata, tenant_id)
SELECT
  tr.user_id,
  'Review: ' || ut.title,
  'You have been assigned as a reviewer/approver for this task.',
  'review',
  CASE WHEN tr.status = 'APPROVED' THEN 'completed' WHEN tr.status = 'REJECTED' THEN 'completed' ELSE 'pending' END,
  'Medium',
  jsonb_build_object(
    'source', 'task_review',
    'source_task_id', tr.task_id,
    'task_reviewer_id', tr.id,
    'role_label', tr.role_label,
    'project_code', ut.metadata->>'project_code',
    'project_id', ut.metadata->>'project_id'
  ),
  ut.tenant_id
FROM public.task_reviewers tr
JOIN public.user_tasks ut ON ut.id = tr.task_id
WHERE tr.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_tasks existing
    WHERE existing.user_id = tr.user_id
      AND existing.type = 'review'
      AND existing.metadata->>'source' = 'task_review'
      AND existing.metadata->>'source_task_id' = tr.task_id::text
  );
