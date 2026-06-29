-- 1. Correct agent config leads for HS, OI, MS
UPDATE public.vcr_insights_agent_config
  SET lead_agent='hannah', contrib_agents=ARRAY['selma'], config_version=config_version+1
  WHERE category_code IN ('HS','OI');

UPDATE public.vcr_insights_agent_config
  SET lead_agent='alex', contrib_agents=ARRAY['selma'], config_version=config_version+1
  WHERE category_code='MS';

-- 2. Drop orphaned vcr_item_evidence table (replaced by p2a_vcr_evidence)
DROP TABLE IF EXISTS public.vcr_item_evidence CASCADE;