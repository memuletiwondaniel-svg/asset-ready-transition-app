INSERT INTO public.agent_training_sessions (
  agent_code, user_id, document_name, document_description, document_type, document_domain,
  status, completed_at, completion_method, knowledge_status, confidence_level, completeness_score,
  key_learnings, extracted_tags, tags, knowledge_card
) VALUES (
  'fred',
  '05b44255-4358-450c-8aa4-0558b31df70b',
  'GoCompletions Platform — Data Structure Discovery',
  'Live crawl + curated reference of the GoCompletions platform: pages, tables, fields, ASMX endpoints, rollup grids, and reference lists. Lets Fred navigate to the right place to retrieve Systems, Sub-Systems, Tags, Punchlist, ITRs, Certificates, Reports and MOC data.',
  'reference',
  'GoCompletions',
  'completed',
  now(),
  'system',
  'verified',
  'high',
  95,
  $$Fred now has deep awareness of GoCompletions structure:
- Rollup grids on CompletionsGrid.aspx: Tags, Punchlist, MOC (with full field schemas).
- Reference tables under /BGC/List/*.aspx: 60+ admin lists incl. Disciplines, ITRs, Equipment Types, Workpacks, Systems, Sub-Systems.
- Search & report hubs: OWL, Handover, Piping searches; ReportFilters.aspx endpoints.
- ASMX endpoints probed: CompletionsGrid.asmx, SubSystemPicker.asmx, ReportFilters.aspx/GetSubSystems, GetTags, GetSystem, GetPunchlist, GetITRs, GetCertificates, GetReports.
- Coverage: All 7 BGC project tiles (BNGL, SANDPIT, NR, SR, UQ, WQ, ZB).
Curated dictionary loaded into Fred's system prompt via gocompletions-knowledge.ts and discovery edge function gohub-discover.$$,
  ARRAY['gocompletions','systems','subsystems','tags','punchlist','itrs','certificates','reports','moc','discovery'],
  ARRAY['gocompletions','discovery','reference'],
  jsonb_build_object(
    'core_facts', jsonb_build_array(
      'GoCompletions exposes rollup grids on CompletionsGrid.aspx for Tags, Punchlist, MOC.',
      'Sub-Systems and Systems are managed via SubSystemPicker.asmx and ReportFilters.aspx/GetSubSystems.',
      'Reference lists (Disciplines, ITRs, Equipment Types, Workpacks, etc.) live under /BGC/List/*.aspx — 60+ tables.',
      'Specialized search pages exist for OWL, Handover and Piping.',
      'Discovery covers all 7 BGC project tiles: BNGL, SANDPIT, NR, SR, UQ, WQ, ZB.'
    ),
    'procedures', jsonb_build_array(
      'To pull Systems/Sub-Systems: call ReportFilters.aspx/GetSubSystems or SubSystemPicker.asmx/GetSubSystems via gocompletions-auth.',
      'To enumerate reference data: navigate /BGC/List/<Entity>.aspx (RadGrid extraction).',
      'For ad-hoc structure probes: invoke the gohub-discover edge function.'
    ),
    'entities', jsonb_build_array('System','SubSystem','Tag','Punchlist','ITR','Certificate','Report','MOC','Workpack','Discipline','EquipmentType'),
    'decision_rules', jsonb_build_array(
      'When user asks about Systems/Sub-Systems, route via SubSystemPicker / ReportFilters endpoints.',
      'When user asks about reference data (Disciplines, Equipment Types, etc.), route to /BGC/List/*.aspx.',
      'When schema is unknown, run gohub-discover before answering.'
    ),
    'sources', jsonb_build_array(
      'supabase/functions/_shared/fred/gocompletions-knowledge.ts',
      'supabase/functions/gohub-discover/index.ts',
      'gocompletions-schema-bngl.md'
    )
  )
);