-- Drop the restrictive task_comments SELECT policy
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;

-- Create a broader policy: allow reading comments for tasks in the same tenant
CREATE POLICY "Users can view task comments in tenant"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tasks ut
    WHERE ut.id = task_comments.task_id
    AND ut.tenant_id = get_user_tenant_id()
  )
);