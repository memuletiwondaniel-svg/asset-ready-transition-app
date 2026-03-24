-- Update ai_agent_registry display names to match confirmed agent identities
UPDATE public.ai_agent_registry 
SET display_name = 'Fred', 
    description = 'Fred is ORSH''s PSSR and Operational Readiness specialist. He handles Pre-Startup Safety Reviews, ORA activity planning, PSSR checklist management, and safety readiness assessment for O&G facilities. Fred runs on Claude Sonnet 4.5 via the Anthropic API.',
    updated_at = now()
WHERE agent_code = 'pssr_ora_agent';

UPDATE public.ai_agent_registry 
SET display_name = 'Sally',
    description = 'Sally is ORSH''s specialist Document Intelligence Agent. She analyses document readiness, identifies gaps, scores quality, and links document status to ORA phase requirements. Sally runs on Claude Sonnet 4.5 via the Anthropic API.',
    updated_at = now()
WHERE agent_code = 'document_agent';
