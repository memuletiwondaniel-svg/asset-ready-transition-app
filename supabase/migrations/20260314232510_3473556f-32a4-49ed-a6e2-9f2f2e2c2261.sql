
-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can SELECT if they own the task or are a reviewer of it
CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks ut WHERE ut.id = task_attachments.task_id AND ut.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.task_reviewers tr
      JOIN public.user_tasks ut ON ut.id = tr.task_id
      WHERE tr.user_id = auth.uid() AND (tr.task_id = task_attachments.task_id OR ut.id = task_attachments.task_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tasks review_task
      WHERE review_task.user_id = auth.uid()
        AND review_task.type = 'review'
        AND (review_task.metadata->>'source_task_id')::uuid = task_attachments.task_id
    )
  );

-- RLS: Authenticated users can INSERT if they own the task or are a reviewer
CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_tasks ut WHERE ut.id = task_attachments.task_id AND ut.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.task_reviewers tr WHERE tr.task_id = task_attachments.task_id AND tr.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.user_tasks review_task
        WHERE review_task.user_id = auth.uid()
          AND review_task.type = 'review'
          AND (review_task.metadata->>'source_task_id')::uuid = task_attachments.task_id
      )
    )
  );

-- RLS: Only the uploader can delete their own attachments
CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Create index for fast lookups
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Allow authenticated users to upload
CREATE POLICY "task_attachments_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

-- Storage RLS: Allow public read (bucket is public)
CREATE POLICY "task_attachments_storage_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'task-attachments');

-- Storage RLS: Allow authenticated users to delete their own uploads
CREATE POLICY "task_attachments_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');
