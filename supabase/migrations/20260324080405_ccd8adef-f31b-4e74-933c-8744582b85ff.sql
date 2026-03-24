INSERT INTO ai_agent_registry (agent_code, display_name, model_id, status, description)
VALUES 
  ('copilot', 'Bob CoPilot', 'claude-sonnet-4-5', 'active', 'Expert operational readiness assistant for ORSH platform'),
  ('document_agent', 'Document Specialist', 'claude-sonnet-4-5', 'active', 'DMS document readiness, gap analysis, quality scoring specialist'),
  ('pssr_ora_agent', 'PSSR/ORA Specialist', 'claude-sonnet-4-5', 'active', 'Pre-Startup Safety Reviews and ORA planning specialist')
ON CONFLICT (agent_code) DO UPDATE SET model_id = EXCLUDED.model_id, updated_at = now();