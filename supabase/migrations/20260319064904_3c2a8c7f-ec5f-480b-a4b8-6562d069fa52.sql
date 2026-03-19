-- ═══════════════════════════════════════════════════════════════
-- AI Agent Training Infrastructure
-- Supports: feedback collection, agent registry, training logs,
-- inter-agent communication, and continuous improvement
-- ═══════════════════════════════════════════════════════════════

-- 1. Agent Registry — tracks all specialist agents and their capabilities
CREATE TABLE IF NOT EXISTS public.ai_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  model_id TEXT NOT NULL DEFAULT 'openai/gpt-5-mini',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing', 'deprecated')),
  domain_tags TEXT[] DEFAULT '{}',
  tools_count INTEGER DEFAULT 0,
  system_prompt_version TEXT DEFAULT 'v1.0',
  capabilities JSONB DEFAULT '[]',
  limitations JSONB DEFAULT '[]',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Response Feedback — thumbs up/down on AI responses
CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id UUID,
  user_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative', 'neutral')),
  correction_text TEXT,
  agent_code TEXT,
  tool_calls_used TEXT[],
  response_latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Training Log — records prompt updates, regression test results, deployments
CREATE TABLE IF NOT EXISTS public.ai_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'prompt_update', 'tool_added', 'tool_updated', 'tool_removed',
    'regression_test', 'model_change', 'agent_added', 'agent_updated',
    'feedback_review', 'edge_case_logged', 'knowledge_expansion',
    'a2a_protocol_update', 'deployment'
  )),
  agent_code TEXT,
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  test_results JSONB,
  performed_by TEXT DEFAULT 'system',
  version_label TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Agent-to-Agent Communication Log
CREATE TABLE IF NOT EXISTS public.ai_agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN (
    'data_request', 'data_response', 'insight_share',
    'escalation', 'context_handoff', 'capability_query',
    'cross_reference', 'alert'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID,
  conversation_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Edge Case Catalog
CREATE TABLE IF NOT EXISTS public.ai_edge_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT,
  trigger_message TEXT NOT NULL,
  expected_behavior TEXT,
  actual_behavior TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT CHECK (category IN (
    'hallucination', 'wrong_tool', 'missing_data', 'format_error',
    'off_topic', 'injection_attempt', 'ambiguous_intent', 'other'
  )),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT false,
  added_to_regression BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_edge_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view agent registry" ON public.ai_agent_registry
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own feedback" ON public.ai_response_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.ai_response_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view training logs" ON public.ai_training_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view agent communications" ON public.ai_agent_communications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view edge cases" ON public.ai_edge_cases
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_conversation ON public.ai_response_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_response_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON public.ai_response_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_training_log_type ON public.ai_training_log(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_log_agent ON public.ai_training_log(agent_code);
CREATE INDEX IF NOT EXISTS idx_ai_a2a_source ON public.ai_agent_communications(source_agent);
CREATE INDEX IF NOT EXISTS idx_ai_a2a_target ON public.ai_agent_communications(target_agent);
CREATE INDEX IF NOT EXISTS idx_ai_a2a_correlation ON public.ai_agent_communications(correlation_id);
CREATE INDEX IF NOT EXISTS idx_ai_edge_cases_resolved ON public.ai_edge_cases(is_resolved);