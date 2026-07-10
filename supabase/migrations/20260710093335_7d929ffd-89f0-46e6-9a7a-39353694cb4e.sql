ALTER TABLE public.vcr_item_insight_templates
  ADD COLUMN IF NOT EXISTS suppress_category_agents boolean NOT NULL DEFAULT false;