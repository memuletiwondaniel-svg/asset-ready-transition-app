-- Create selma_resolution_failures table for tracking unresolved document type queries
CREATE TABLE public.selma_resolution_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  cleaned_query TEXT NOT NULL,
  levenshtein_top3 JSONB DEFAULT '[]'::jsonb,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_as TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on cleaned_query for upsert operations
CREATE UNIQUE INDEX idx_selma_resolution_failures_cleaned_query ON public.selma_resolution_failures (cleaned_query);

-- Create index for dashboard queries (unresolved, high occurrence)
CREATE INDEX idx_selma_resolution_failures_unresolved ON public.selma_resolution_failures (resolved, occurrence_count DESC) WHERE resolved = false;

-- Enable RLS
ALTER TABLE public.selma_resolution_failures ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all entries (admin dashboard)
CREATE POLICY "Authenticated users can view resolution failures"
  ON public.selma_resolution_failures
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (edge functions use service role key)
-- No INSERT/UPDATE policies for authenticated role — writes happen via service role only