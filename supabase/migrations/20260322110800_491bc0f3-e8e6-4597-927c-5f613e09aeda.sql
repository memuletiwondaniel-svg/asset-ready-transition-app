-- =============================================================================
-- SECURITY HARDENING: Remove unauthenticated access to operational data tables
-- =============================================================================
-- Problem: Many SELECT policies use role=public with USING(true), allowing
-- completely unauthenticated reads of sensitive business data including:
-- ORA plans, P2A handovers, PSSR walkdowns, project documents, VCRs, etc.
--
-- Fix: Change these policies to role=authenticated with explicit auth check.
-- Reference/config tables with USING(is_active=true) are left as-is since
-- they expose only filtered catalog data needed for login/onboarding flows.
--
-- Tables fixed (public+true → authenticated):
--   ora_cost_categories, ora_handover_items, ora_maintenance_batches,
--   ora_maintenance_readiness, ora_plan_activities, ora_training_approvals,
--   ora_training_evidence, ora_training_items, ora_training_materials,
--   ora_training_plans, orp_approvals, orp_template_approvals,
--   orp_template_deliverables, p2a_handover_approvers,
--   p2a_handover_point_systems, p2a_handover_points, p2a_handover_prerequisites,
--   p2a_prerequisite_attachments, p2a_project_milestones, p2a_project_phases,
--   p2a_subsystems, p2a_systems, p2a_user_presence, p2a_vcr_evidence,
--   p2a_vcr_prerequisites, p2a_vcr_qualifications,
--   pssr_approvers, pssr_delivery_parties, pssr_key_activities,
--   pssr_reason_ati_scopes, pssr_reason_categories,
--   pssr_walkdown_attendees, pssr_walkdown_events, pssr_walkdown_observations,
--   project_documents, project_milestones, project_region, project_region_plant,
--   project_region_station, project_team_members (public duplicate),
--   sof_approvers, sof_certificates
--
-- Tables with public+filtered (is_active=true) left as-is (reference data):
--   commission, discipline, field, hubs, plant, positions, roles,
--   role_category, station, pssr_checklist_*, pssr_reasons, pssr_moc_scopes,
--   pssr_tie_in_scopes, pssr_reason_sub_options, orp_deliverables_catalog,
--   orp_deliverable_sub_options, orp_templates, orm_deliverable_templates,
--   p2a_deliverable_categories, project_milestone_types, projects, p2a_handovers
--
-- Tables with public+subquery-filtered (EXISTS) left as-is:
--   p2a_approval_workflow, p2a_audit_trail, p2a_deliverable_attachments,
--   p2a_handover_deliverables, orm_template_checklists, orm_template_tasks
-- =============================================================================

DO $$
DECLARE
  -- Tables that have public role + USING(true) and must be locked to authenticated
  tbl TEXT;
  pol_name TEXT;
  tables_and_policies TEXT[][] := ARRAY[
    ARRAY['ora_cost_categories', 'Anyone can read cost categories'],
    ARRAY['ora_handover_items', 'ora_handover_items_select'],
    ARRAY['ora_maintenance_batches', 'Users can view maintenance batches'],
    ARRAY['ora_maintenance_readiness', 'ora_maintenance_readiness_select'],
    ARRAY['ora_plan_activities', 'Users can view plan activities'],
    ARRAY['ora_training_approvals', 'ora_training_approvals_select'],
    ARRAY['ora_training_evidence', 'Anyone can view training evidence records'],
    ARRAY['ora_training_items', 'ora_training_items_select'],
    ARRAY['ora_training_materials', 'ora_training_materials_select'],
    ARRAY['ora_training_plans', 'ora_training_plans_select'],
    ARRAY['orp_approvals', 'Users can view all approvals'],
    ARRAY['orp_template_approvals', 'Anyone can view template approvals'],
    ARRAY['orp_template_deliverables', 'Anyone can view template deliverables'],
    ARRAY['p2a_handover_approvers', 'Users can view handover approvers'],
    ARRAY['p2a_handover_point_systems', 'Users can view all handover point systems'],
    ARRAY['p2a_handover_points', 'Users can view all handover points'],
    ARRAY['p2a_handover_prerequisites', 'Users can view handover prerequisites'],
    ARRAY['p2a_prerequisite_attachments', 'Users can view prerequisite attachments'],
    ARRAY['p2a_project_milestones', 'Users can view all milestones'],
    ARRAY['p2a_project_phases', 'Users can view all phases'],
    ARRAY['p2a_subsystems', 'Users can view all subsystems'],
    ARRAY['p2a_systems', 'Users can view all systems'],
    ARRAY['p2a_user_presence', 'Users can view presence'],
    ARRAY['p2a_vcr_evidence', 'Users can view all VCR evidence'],
    ARRAY['p2a_vcr_prerequisites', 'Users can view all VCR prerequisites'],
    ARRAY['p2a_vcr_qualifications', 'Users can view all VCR qualifications'],
    ARRAY['pssr_approvers', 'Anyone can view pssr approvers'],
    ARRAY['pssr_delivery_parties', 'Allow read access to pssr_delivery_parties'],
    ARRAY['pssr_key_activities', 'Users can view activities for PSSRs they have access to'],
    ARRAY['pssr_reason_ati_scopes', 'Allow read access to pssr_reason_ati_scopes'],
    ARRAY['pssr_reason_categories', 'Allow read access to pssr_reason_categories'],
    ARRAY['pssr_walkdown_attendees', 'Users can view walkdown attendees'],
    ARRAY['pssr_walkdown_events', 'Users can view walkdown events for their PSSRs'],
    ARRAY['pssr_walkdown_observations', 'Users can view walkdown observations'],
    ARRAY['project_documents', 'Users can view project documents'],
    ARRAY['project_milestones', 'Users can view project milestones'],
    ARRAY['project_region', 'Allow read access to project regions'],
    ARRAY['project_region_plant', 'Allow read access to region plants'],
    ARRAY['project_region_station', 'Allow read access to region stations'],
    ARRAY['sof_approvers', 'Users can view SoF approvers'],
    ARRAY['sof_certificates', 'Users can view SoF certificates']
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(tables_and_policies, 1) LOOP
    tbl := tables_and_policies[i][1];
    pol_name := tables_and_policies[i][2];

    -- Drop the old public policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tbl);

    -- Recreate as authenticated-only with explicit auth check
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL)',
      pol_name, tbl
    );
  END LOOP;
END $$;

-- Fix the duplicate public-role policy on project_team_members
-- (there's already a tenant-scoped authenticated policy)
DROP POLICY IF EXISTS "Anyone can view project team members" ON public.project_team_members;
CREATE POLICY "Anyone can view project team members"
  ON public.project_team_members AS PERMISSIVE
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- Fix p2a_handover_plans duplicate public policy
-- (there's already a tenant-scoped authenticated policy)
DROP POLICY IF EXISTS "Users can view all handover plans" ON public.p2a_handover_plans;
CREATE POLICY "Users can view all handover plans"
  ON public.p2a_handover_plans AS PERMISSIVE
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);