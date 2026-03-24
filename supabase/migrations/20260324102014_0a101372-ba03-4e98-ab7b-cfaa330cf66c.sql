UPDATE public.ai_agent_registry 
SET display_name = 'Selma',
    description = 'Selma is ORSH''s specialist Document Intelligence Agent. She analyses document readiness, identifies gaps, scores quality, and links document status to ORA phase requirements. Selma runs on Claude Sonnet 4.5 via the Anthropic API.',
    updated_at = now()
WHERE agent_code = 'document_agent';
