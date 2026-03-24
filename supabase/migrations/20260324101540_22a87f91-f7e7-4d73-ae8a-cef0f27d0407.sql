-- Insert deployment log entries for March 2026
-- Using a DO block to bypass RLS via migration context

INSERT INTO public.deployment_log (version_label, release_notes, deployed_by_name, status, environment, changes_summary, created_at)
VALUES
('v6.0 — Claude Migration', 
 'Migration of all active AI agents from Lovable AI Gateway to Anthropic API direct calls', 
 'Daniel Memuletiwon', 'success', 'production', 
 '[{"text": "Removed Lovable Gateway from ai-chat Edge Function. All three agents (Bob CoPilot, Sally/Document Agent, PSSR/ORA Agent) now call https://api.anthropic.com/v1/messages directly using claude-sonnet-4-5."}, {"text": "ANTHROPIC_API_KEY stored as Supabase secret. Agent registry updated. SSE output format preserved."}, {"text": "Rollback: Revert ai-chat Edge Function to previous version, re-add Lovable Gateway calls"}]'::jsonb, 
 '2026-03-23T10:00:00Z'),

('v6.1 — Markdown Rendering', 
 'React-markdown with remark-gfm installed for proper chat UI rendering', 
 'Daniel Memuletiwon', 'success', 'production', 
 '[{"text": "Installed react-markdown and remark-gfm. ORSHChatDialog component updated to render markdown tables, bold, headers, lists and code blocks from agent responses."}, {"text": "Rollback: Remove react-markdown, revert to plain text rendering"}]'::jsonb, 
 '2026-03-23T12:00:00Z'),

('v6.2 — Security Hardening', 
 'Six critical security issues resolved across database, credentials and repository', 
 'Daniel Memuletiwon', 'success', 'production', 
 '[{"text": "profiles_safe view created, OAuth token encryption (AES-256-GCM), 43 unauthenticated policies closed"}, {"text": "Email column protection, 416 RLS policies optimised to (select auth.uid()) subquery, .env removed from GitHub"}, {"text": "Rollback: Individual migration rollbacks available per security fix"}]'::jsonb, 
 '2026-03-23T14:00:00Z'),

('v6.3 — DMS Wizard Improvements', 
 'Document Identification Workflow modal redesigned — stepper, DMS platform cards, plant code resolution, searchable dropdowns', 
 'Daniel Memuletiwon', 'success', 'production', 
 '[{"text": "Modern 3-step stepper implemented. DMS platform cards redesigned with logos (Assai, Wrench, Documentum, SharePoint)."}, {"text": "Searchable comboboxes for Project Code and Plant Code. Auto-detection fixed. Project ID visible in dropdown. plant_name to dms_plants lookup fixed."}, {"text": "Rollback: Revert modal component to previous version"}]'::jsonb, 
 '2026-03-24T08:00:00Z');
