
-- Table 1: Deep interaction metrics for every Selma interaction
CREATE TABLE public.selma_interaction_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  query_text TEXT,
  intent_detected TEXT,
  agent_routed TEXT,
  routing_method TEXT,
  search_strategy_used JSONB,
  documents_found INTEGER DEFAULT 0,
  document_number TEXT,
  download_attempted BOOLEAN DEFAULT false,
  download_success BOOLEAN DEFAULT false,
  analysis_completed BOOLEAN DEFAULT false,
  pages_processed INTEGER DEFAULT 0,
  cascade_depth INTEGER DEFAULT 0,
  total_latency_ms INTEGER DEFAULT 0,
  search_latency_ms INTEGER DEFAULT 0,
  download_latency_ms INTEGER DEFAULT 0,
  analysis_latency_ms INTEGER DEFAULT 0,
  tool_calls TEXT[] DEFAULT '{}',
  outcome TEXT DEFAULT 'pending',
  user_feedback TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: Daily KPI snapshots for trend tracking
CREATE TABLE public.selma_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  kpi_name TEXT NOT NULL,
  kpi_value NUMERIC NOT NULL,
  sample_size INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: Learned strategies that evolve Selma's behavior
CREATE TABLE public.selma_learned_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_type TEXT NOT NULL,
  trigger_pattern TEXT NOT NULL,
  learned_value JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC DEFAULT 0.5,
  times_applied INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'pattern_mining',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_selma_metrics_created ON public.selma_interaction_metrics(created_at DESC);
CREATE INDEX idx_selma_metrics_outcome ON public.selma_interaction_metrics(outcome);
CREATE INDEX idx_selma_metrics_user ON public.selma_interaction_metrics(user_id);
CREATE INDEX idx_selma_metrics_agent ON public.selma_interaction_metrics(agent_routed);
CREATE INDEX idx_selma_kpi_name_period ON public.selma_kpi_snapshots(kpi_name, period_start DESC);
CREATE INDEX idx_selma_strategies_active ON public.selma_learned_strategies(is_active, strategy_type);
CREATE INDEX idx_selma_strategies_trigger ON public.selma_learned_strategies(trigger_pattern);

-- RLS
ALTER TABLE public.selma_interaction_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selma_kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selma_learned_strategies ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read metrics/kpis/strategies, service role inserts
CREATE POLICY "Authenticated users can read interaction metrics"
  ON public.selma_interaction_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert interaction metrics"
  ON public.selma_interaction_metrics FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read KPI snapshots"
  ON public.selma_kpi_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert KPI snapshots"
  ON public.selma_kpi_snapshots FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read learned strategies"
  ON public.selma_learned_strategies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage learned strategies"
  ON public.selma_learned_strategies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update learned strategies"
  ON public.selma_learned_strategies FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
