UPDATE public.ai_agent_registry
SET display_name = 'Zain',
    description = 'Zain is ORSH''s Training Intelligence specialist. He handles training plan analysis, competency gap identification, training cost tracking, training materials approval workflows, and training readiness scoring for O&G capital projects. Zain runs on Claude Haiku for fast, structured training queries.',
    updated_at = now()
WHERE agent_code = 'training_agent';