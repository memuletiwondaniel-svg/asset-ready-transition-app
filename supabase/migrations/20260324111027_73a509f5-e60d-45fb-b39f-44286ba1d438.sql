INSERT INTO public.ai_agent_registry (
  agent_code,
  display_name,
  model_id,
  status,
  domain_tags,
  description,
  tools_count,
  capabilities,
  updated_at
) VALUES (
  'hannah',
  'Hannah',
  'claude-sonnet-4-5',
  'active',
  ARRAY['p2a', 'handover', 'vcr', 'itr', 'punchlist', 'itp', 'commissioning', 'pac', 'fac', 'readiness', 'gocompletions', 'owl', 'rfsu', 'rfo'],
  'Hannah is ORSH''s P2A Handover Intelligence Agent. She owns the complete Project-to-Asset handover process — from hardware and commissioning readiness via GoCompletions, through VCR prerequisite tracking, to PAC and FAC issuance. She is the cross-agent readiness orchestrator — she aggregates intelligence from Selma (documents), Zain (training), Alex (CMMS), Fred (PSSR) and Ivan (process safety) into a single handover readiness verdict per system and VCR.',
  12,
  '{"tools": ["get_vcr_readiness_summary", "get_itr_status_by_system", "get_punch_list_status", "get_itp_completion", "get_system_handover_readiness", "get_vcr_prerequisites_status", "get_pac_readiness", "get_owl_items", "get_p2a_approval_status", "aggregate_handover_readiness", "get_gocompletions_sync_status", "flag_startup_risk"], "cross_agent": true}'::jsonb,
  now()
)
ON CONFLICT (agent_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  model_id = EXCLUDED.model_id,
  status = EXCLUDED.status,
  domain_tags = EXCLUDED.domain_tags,
  description = EXCLUDED.description,
  tools_count = EXCLUDED.tools_count,
  capabilities = EXCLUDED.capabilities,
  updated_at = now();