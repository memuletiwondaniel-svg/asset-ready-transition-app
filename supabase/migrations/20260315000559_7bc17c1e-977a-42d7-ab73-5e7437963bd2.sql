-- Add tenant_id to task_documents
ALTER TABLE public.task_documents
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to task_document_comments  
ALTER TABLE public.task_document_comments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Backfill tenant_id from the linked user_tasks
UPDATE public.task_documents td
SET tenant_id = ut.tenant_id
FROM public.user_tasks ut
WHERE ut.id = td.task_id
AND td.tenant_id IS NULL;

UPDATE public.task_document_comments tdc
SET tenant_id = td.tenant_id
FROM public.task_documents td
WHERE td.id = tdc.task_document_id
AND tdc.tenant_id IS NULL;

-- Apply auto-stamp trigger for tenant_id
CREATE TRIGGER set_task_documents_tenant_id
  BEFORE INSERT ON public.task_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE TRIGGER set_task_document_comments_tenant_id
  BEFORE INSERT ON public.task_document_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Drop old RLS policies
DROP POLICY IF EXISTS "Task owner can access document" ON public.task_documents;
DROP POLICY IF EXISTS "Document participants can access comments" ON public.task_document_comments;

-- Recreate RLS for task_documents with tenant isolation + WITH CHECK
CREATE POLICY "Task participants can access document"
  ON public.task_documents FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_tasks ut
        WHERE ut.id = task_documents.task_id
        AND ut.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.task_reviewers tr
        WHERE tr.task_id = task_documents.task_id
        AND tr.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_tasks review_task
        WHERE review_task.type = 'review'
        AND (review_task.metadata->>'source_task_id')::UUID = task_documents.task_id
        AND review_task.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_tasks ut
        WHERE ut.id = task_documents.task_id
        AND ut.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.task_reviewers tr
        WHERE tr.task_id = task_documents.task_id
        AND tr.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_tasks review_task
        WHERE review_task.type = 'review'
        AND (review_task.metadata->>'source_task_id')::UUID = task_documents.task_id
        AND review_task.user_id = auth.uid()
      )
    )
  );

-- Recreate RLS for task_document_comments with tenant isolation + WITH CHECK
CREATE POLICY "Document participants can access comments"
  ON public.task_document_comments FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
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
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
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

-- Index on tenant_id
CREATE INDEX IF NOT EXISTS idx_task_documents_tenant_id ON public.task_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_document_comments_tenant_id ON public.task_document_comments(tenant_id);