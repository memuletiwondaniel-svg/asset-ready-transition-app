
-- Create task_reviewers table for lightweight sign-off on simple tasks
CREATE TABLE public.task_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

ALTER TABLE public.task_reviewers ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can see reviewers
CREATE POLICY "Authenticated users can view task reviewers"
  ON public.task_reviewers FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: task owner or the reviewer themselves can add
CREATE POLICY "Task owners can add reviewers"
  ON public.task_reviewers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tasks ut
      WHERE ut.id = task_id AND ut.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- UPDATE: task owner or the assigned reviewer can update (for approve/reject)
CREATE POLICY "Task owners and reviewers can update"
  ON public.task_reviewers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_tasks ut
      WHERE ut.id = task_id AND ut.user_id = auth.uid()
    )
  );

-- DELETE: task owner can remove reviewers
CREATE POLICY "Task owners can remove reviewers"
  ON public.task_reviewers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks ut
      WHERE ut.id = task_id AND ut.user_id = auth.uid()
    )
  );

-- Index for quick lookup by task
CREATE INDEX idx_task_reviewers_task_id ON public.task_reviewers(task_id);
CREATE INDEX idx_task_reviewers_user_id ON public.task_reviewers(user_id);
