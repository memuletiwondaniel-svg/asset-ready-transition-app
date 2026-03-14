
-- Task documents table for collaborative editing
CREATE TABLE public.task_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  last_edited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_documents_task_id_unique UNIQUE (task_id)
);

-- Task document inline comments
CREATE TABLE public.task_document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_document_id UUID NOT NULL REFERENCES public.task_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  selection_text TEXT,
  position_data JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_document_comments ENABLE ROW LEVEL SECURITY;

-- RLS for task_documents
CREATE POLICY "Task owner can access document"
  ON public.task_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks ut
      WHERE ut.id = task_documents.task_id
      AND ut.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.task_reviewers tr
      WHERE tr.task_id = task_documents.task_id
      AND tr.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_tasks review_task
      WHERE review_task.type = 'review'
      AND (review_task.metadata->>'source_task_id')::UUID = task_documents.task_id
      AND review_task.user_id = auth.uid()
    )
  );

-- RLS for task_document_comments
CREATE POLICY "Document participants can access comments"
  ON public.task_document_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_documents td
      JOIN public.user_tasks ut ON ut.id = td.task_id
      WHERE td.id = task_document_comments.task_document_id
      AND (
        ut.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_reviewers tr
          WHERE tr.task_id = td.task_id
          AND tr.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.user_tasks review_task
          WHERE review_task.type = 'review'
          AND (review_task.metadata->>'source_task_id')::UUID = td.task_id
          AND review_task.user_id = auth.uid()
        )
      )
    )
  );

-- Indexes
CREATE INDEX idx_task_documents_task_id ON public.task_documents(task_id);
CREATE INDEX idx_task_document_comments_doc_id ON public.task_document_comments(task_document_id);
CREATE INDEX idx_task_document_comments_user_id ON public.task_document_comments(user_id);
