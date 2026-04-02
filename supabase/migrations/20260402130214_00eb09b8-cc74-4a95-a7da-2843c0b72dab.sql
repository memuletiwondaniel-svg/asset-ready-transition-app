
-- Table: selma_document_type_knowledge
CREATE TABLE public.selma_document_type_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code TEXT NOT NULL UNIQUE,
  type_name TEXT NOT NULL,
  purpose TEXT,
  typical_structure JSONB DEFAULT '[]'::jsonb,
  key_themes JSONB DEFAULT '[]'::jsonb,
  handover_relevance TEXT,
  common_statuses JSONB DEFAULT '{}'::jsonb,
  avg_page_count INT,
  cross_references JSONB DEFAULT '[]'::jsonb,
  selma_tips TEXT,
  sample_projects JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(3,2) DEFAULT 0,
  documents_analyzed INT DEFAULT 0,
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.selma_document_type_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge"
  ON public.selma_document_type_knowledge FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages knowledge"
  ON public.selma_document_type_knowledge FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Table: selma_training_queue
CREATE TABLE public.selma_training_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code TEXT NOT NULL,
  type_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  priority INT NOT NULL DEFAULT 100,
  documents_sampled JSONB DEFAULT '[]'::jsonb,
  last_attempt TIMESTAMPTZ,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_training_queue_type_code ON public.selma_training_queue(type_code);

ALTER TABLE public.selma_training_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training queue"
  ON public.selma_training_queue FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages training queue"
  ON public.selma_training_queue FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_selma_knowledge_updated_at
  BEFORE UPDATE ON public.selma_document_type_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selma_training_queue_updated_at
  BEFORE UPDATE ON public.selma_training_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
