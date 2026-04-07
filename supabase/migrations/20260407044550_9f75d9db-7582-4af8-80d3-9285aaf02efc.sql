-- Extend agent_training_sessions with training module columns
ALTER TABLE public.agent_training_sessions
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_domain text,
  ADD COLUMN IF NOT EXISTS document_revision text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_mime_type text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS anonymization_rules jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS knowledge_card jsonb,
  ADD COLUMN IF NOT EXISTS confidence_level text,
  ADD COLUMN IF NOT EXISTS extracted_tags text[],
  ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_test_score integer,
  ADD COLUMN IF NOT EXISTS last_test_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completion_method text,
  ADD COLUMN IF NOT EXISTS training_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS stale_after timestamptz,
  ADD COLUMN IF NOT EXISTS open_questions_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contradiction_flags jsonb DEFAULT '[]';

-- Create storage bucket for training documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-training-docs', 'agent-training-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload training docs to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-training-docs'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own training docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-training-docs'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own training docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-training-docs'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own training docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-training-docs'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);