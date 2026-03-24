UPDATE public.ai_agent_registry
SET display_name = 'Alex',
    description = 'Alex is ORSH''s CMMS and Maintenance Intelligence specialist. He handles equipment care, maintenance readiness, spare parts procurement tracking, preventive maintenance scheduling, and asset register intelligence. Alex runs on Claude Haiku for fast, lookup-heavy maintenance queries.',
    updated_at = now()
WHERE agent_code = 'cmms_agent';