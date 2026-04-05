-- Fred interaction metrics (parallel to selma_interaction_metrics)
CREATE TABLE public.fred_interaction_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query_text TEXT,
  tool_used TEXT,
  project_code TEXT,
  subsystem_code TEXT,
  outcome TEXT NOT NULL DEFAULT 'pending',
  result_count INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  cascade_depth INTEGER DEFAULT 1,
  strategies_tried TEXT[] DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_interaction_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fred metrics"
  ON public.fred_interaction_metrics FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can insert fred metrics"
  ON public.fred_interaction_metrics FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX idx_fred_metrics_created ON public.fred_interaction_metrics(created_at DESC);
CREATE INDEX idx_fred_metrics_outcome ON public.fred_interaction_metrics(outcome);
CREATE INDEX idx_fred_metrics_tool ON public.fred_interaction_metrics(tool_used);

-- Fred resolution failures (parallel to selma_resolution_failures)
CREATE TABLE public.fred_resolution_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  cleaned_query TEXT NOT NULL,
  closest_matches JSONB DEFAULT '[]',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_as TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_resolution_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fred failures"
  ON public.fred_resolution_failures FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can manage fred failures"
  ON public.fred_resolution_failures FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX idx_fred_failures_cleaned ON public.fred_resolution_failures(cleaned_query);
CREATE INDEX idx_fred_failures_unresolved ON public.fred_resolution_failures(resolved, occurrence_count DESC);

-- Fred KPI snapshots (parallel to selma_kpi_snapshots)
CREATE TABLE public.fred_kpi_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL DEFAULT '7day',
  kpi_name TEXT NOT NULL,
  kpi_value NUMERIC NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fred_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fred kpis"
  ON public.fred_kpi_snapshots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can insert fred kpis"
  ON public.fred_kpi_snapshots FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX idx_fred_kpis_created ON public.fred_kpi_snapshots(created_at DESC);
CREATE INDEX idx_fred_kpis_name ON public.fred_kpi_snapshots(kpi_name, created_at DESC);