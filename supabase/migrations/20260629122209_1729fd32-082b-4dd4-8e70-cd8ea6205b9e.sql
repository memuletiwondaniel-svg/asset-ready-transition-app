GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_item_insights TO authenticated;
GRANT ALL ON public.vcr_item_insights TO service_role;
GRANT SELECT ON public.vcr_insights_agent_config TO authenticated;
GRANT ALL ON public.vcr_insights_agent_config TO service_role;