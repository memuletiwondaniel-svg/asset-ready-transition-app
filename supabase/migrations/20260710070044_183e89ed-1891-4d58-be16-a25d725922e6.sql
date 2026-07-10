
-- Phase 1: item-level routing template + evidence match cache.

CREATE TABLE public.vcr_item_insight_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vcr_item_id uuid NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  engines text[] NOT NULL DEFAULT ARRAY['evidence_match','workflow_signals','currency_check']::text[],
  register_schema jsonb NULL,
  source_rollup jsonb NULL,
  action_templates jsonb NULL,
  config_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vcr_item_id)
);
GRANT SELECT ON public.vcr_item_insight_templates TO authenticated;
GRANT ALL ON public.vcr_item_insight_templates TO service_role;
ALTER TABLE public.vcr_item_insight_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read templates"
  ON public.vcr_item_insight_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages templates"
  ON public.vcr_item_insight_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_vcr_item_insight_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_vcr_item_insight_templates_updated_at
  BEFORE UPDATE ON public.vcr_item_insight_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_vcr_item_insight_templates();

CREATE TABLE public.evidence_match_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.p2a_vcr_evidence(id) ON DELETE CASCADE,
  req_hash text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('match','related','unrelated')),
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, req_hash)
);
GRANT SELECT ON public.evidence_match_cache TO authenticated;
GRANT ALL ON public.evidence_match_cache TO service_role;
ALTER TABLE public.evidence_match_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read evidence match cache"
  ON public.evidence_match_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages evidence match cache"
  ON public.evidence_match_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
