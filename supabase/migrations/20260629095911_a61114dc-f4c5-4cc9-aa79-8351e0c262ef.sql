
-- AI-1 Readiness Insights Engine: cache + agent routing config
CREATE TABLE public.vcr_insights_agent_config (
  category_code text PRIMARY KEY,
  lead_agent text NOT NULL,
  contrib_agents text[] NOT NULL DEFAULT '{}',
  config_version int NOT NULL DEFAULT 1,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vcr_insights_agent_config TO authenticated;
GRANT ALL ON public.vcr_insights_agent_config TO service_role;
ALTER TABLE public.vcr_insights_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agent config" ON public.vcr_insights_agent_config
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vcr_item_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vcr_id uuid NOT NULL,
  vcr_item_id uuid NOT NULL,
  payload jsonb NOT NULL,
  inputs_hash text NOT NULL,
  state text NOT NULL,
  severity text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vcr_id, vcr_item_id)
);
CREATE INDEX idx_vcr_item_insights_lookup ON public.vcr_item_insights(vcr_id, vcr_item_id);
GRANT SELECT ON public.vcr_item_insights TO authenticated;
GRANT ALL ON public.vcr_item_insights TO service_role;
ALTER TABLE public.vcr_item_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read insights" ON public.vcr_item_insights
  FOR SELECT TO authenticated USING (true);

-- Seed agent routing (post-DI rename). Selma always runs as contributor.
INSERT INTO public.vcr_insights_agent_config (category_code, lead_agent, contrib_agents, notes) VALUES
  ('TI', 'fred',  ARRAY['selma'],         'Technical Integrity → Fred completions intelligence'),
  ('DI', 'ivan',  ARRAY['selma'],         'Design Integrity → Ivan design/safety study reader'),
  ('HS', 'ivan',  ARRAY['selma'],         'Health & Safety → Ivan safety/HEMP'),
  ('OI', 'fred',  ARRAY['selma'],         'Operating Integrity → Fred'),
  ('OR', 'hannah',ARRAY['selma'],         'Organization → Hannah (deferred)'),
  ('MS', 'selma', ARRAY[]::text[],        'Management Systems → Selma lead (critical docs)')
ON CONFLICT (category_code) DO NOTHING;
