
-- Enums
CREATE TYPE public.fred_training_category AS ENUM (
  'losh_drawings',
  'completions_procedure',
  'logic_way',
  'csu_masterclass',
  'blank_itrs',
  'repetitive_failure',
  'lessons_learnt',
  'flaws_database',
  'csi_database',
  'ctps',
  'sat_fat_sit',
  'csu_plans',
  'hazop_omar'
);

CREATE TYPE public.fred_knowledge_type AS ENUM (
  'procedure',
  'lesson',
  'itr_template',
  'test_criteria',
  'incident',
  'failure_pattern',
  'risk_pattern',
  'plan_template',
  'acceptance_criteria'
);

-- Training Queue
CREATE TABLE public.fred_training_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  category public.fred_training_category NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5,
  error_details TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_training_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view training queue"
  ON public.fred_training_queue FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert training queue"
  ON public.fred_training_queue FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update training queue"
  ON public.fred_training_queue FOR UPDATE TO authenticated
  USING (true);

-- Domain Knowledge
CREATE TABLE public.fred_domain_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.fred_training_category NOT NULL,
  knowledge_type public.fred_knowledge_type NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_file TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_domain_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view domain knowledge"
  ON public.fred_domain_knowledge FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages domain knowledge"
  ON public.fred_domain_knowledge FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX idx_fred_knowledge_dedup
  ON public.fred_domain_knowledge (category, title, source_file);

CREATE INDEX idx_fred_knowledge_category ON public.fred_domain_knowledge (category);
CREATE INDEX idx_fred_knowledge_tags ON public.fred_domain_knowledge USING GIN (tags);

-- Training Documents
CREATE TABLE public.fred_training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  category public.fred_training_category NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_training_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view training documents"
  ON public.fred_training_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upload training documents"
  ON public.fred_training_documents FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete their own training documents"
  ON public.fred_training_documents FOR DELETE TO authenticated
  USING ((select auth.uid()) = uploaded_by);

-- Timestamp trigger
CREATE TRIGGER update_fred_training_queue_updated_at
  BEFORE UPDATE ON public.fred_training_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fred_domain_knowledge_updated_at
  BEFORE UPDATE ON public.fred_domain_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('fred_training_docs', 'fred_training_docs', false);

CREATE POLICY "Authenticated users can upload fred training docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fred_training_docs');

CREATE POLICY "Authenticated users can view fred training docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fred_training_docs');

CREATE POLICY "Authenticated users can delete own fred training docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fred_training_docs' AND (select auth.uid())::text = (storage.foldername(name))[1]);
