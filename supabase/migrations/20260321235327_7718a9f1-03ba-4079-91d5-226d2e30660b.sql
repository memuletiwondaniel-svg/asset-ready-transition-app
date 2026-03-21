-- ============================================================
-- Fix Overly Permissive RLS Policies
-- Replace USING(true) / WITH CHECK(true) on write operations
-- with proper role-based checks using existing SECURITY DEFINER functions
-- ============================================================

-- ============================================================
-- TIER 1: Admin/Moderator-only configuration tables
-- Check: user_is_admin(auth.uid()) OR user_has_role(auth.uid(), 'moderator')
-- ============================================================

-- dms_disciplines
DROP POLICY IF EXISTS "Authenticated users can delete disciplines" ON public.dms_disciplines;
DROP POLICY IF EXISTS "Authenticated users can insert disciplines" ON public.dms_disciplines;
DROP POLICY IF EXISTS "Authenticated users can update disciplines" ON public.dms_disciplines;

CREATE POLICY "Admins can delete disciplines" ON public.dms_disciplines
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert disciplines" ON public.dms_disciplines
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update disciplines" ON public.dms_disciplines
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_document_type_secondary_disciplines
DROP POLICY IF EXISTS "Authenticated users can delete secondary disciplines" ON public.dms_document_type_secondary_disciplines;
DROP POLICY IF EXISTS "Authenticated users can insert secondary disciplines" ON public.dms_document_type_secondary_disciplines;

CREATE POLICY "Admins can delete secondary disciplines" ON public.dms_document_type_secondary_disciplines
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert secondary disciplines" ON public.dms_document_type_secondary_disciplines
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_document_types
DROP POLICY IF EXISTS "Authenticated users can delete document types" ON public.dms_document_types;
DROP POLICY IF EXISTS "Authenticated users can insert document types" ON public.dms_document_types;
DROP POLICY IF EXISTS "Authenticated users can update document types" ON public.dms_document_types;

CREATE POLICY "Admins can delete document types" ON public.dms_document_types
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert document types" ON public.dms_document_types
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update document types" ON public.dms_document_types
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_numbering_segments
DROP POLICY IF EXISTS "Tenant users can insert numbering segments" ON public.dms_numbering_segments;

CREATE POLICY "Admins can insert numbering segments" ON public.dms_numbering_segments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_originators
DROP POLICY IF EXISTS "Allow authenticated delete access on dms_originators" ON public.dms_originators;
DROP POLICY IF EXISTS "Allow authenticated insert access on dms_originators" ON public.dms_originators;
DROP POLICY IF EXISTS "Allow authenticated update access on dms_originators" ON public.dms_originators;

CREATE POLICY "Admins can delete dms_originators" ON public.dms_originators
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_originators" ON public.dms_originators
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_originators" ON public.dms_originators
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_plants
DROP POLICY IF EXISTS "Authenticated users can delete dms_plants" ON public.dms_plants;
DROP POLICY IF EXISTS "Authenticated users can insert dms_plants" ON public.dms_plants;
DROP POLICY IF EXISTS "Authenticated users can update dms_plants" ON public.dms_plants;

CREATE POLICY "Admins can delete dms_plants" ON public.dms_plants
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_plants" ON public.dms_plants
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_plants" ON public.dms_plants
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_projects
DROP POLICY IF EXISTS "Authenticated users can delete dms_projects" ON public.dms_projects;
DROP POLICY IF EXISTS "Authenticated users can insert dms_projects" ON public.dms_projects;
DROP POLICY IF EXISTS "Authenticated users can update dms_projects" ON public.dms_projects;

CREATE POLICY "Admins can delete dms_projects" ON public.dms_projects
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_projects" ON public.dms_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_projects" ON public.dms_projects
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_sites
DROP POLICY IF EXISTS "Allow authenticated delete access on dms_sites" ON public.dms_sites;
DROP POLICY IF EXISTS "Allow authenticated insert access on dms_sites" ON public.dms_sites;
DROP POLICY IF EXISTS "Allow authenticated update access on dms_sites" ON public.dms_sites;

CREATE POLICY "Admins can delete dms_sites" ON public.dms_sites
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_sites" ON public.dms_sites
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_sites" ON public.dms_sites
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_status_codes
DROP POLICY IF EXISTS "Allow authenticated delete on dms_status_codes" ON public.dms_status_codes;
DROP POLICY IF EXISTS "Allow authenticated insert on dms_status_codes" ON public.dms_status_codes;
DROP POLICY IF EXISTS "Allow authenticated update on dms_status_codes" ON public.dms_status_codes;

CREATE POLICY "Admins can delete dms_status_codes" ON public.dms_status_codes
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_status_codes" ON public.dms_status_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_status_codes" ON public.dms_status_codes
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- dms_units
DROP POLICY IF EXISTS "Allow authenticated delete access on dms_units" ON public.dms_units;
DROP POLICY IF EXISTS "Allow authenticated insert access on dms_units" ON public.dms_units;
DROP POLICY IF EXISTS "Allow authenticated update access on dms_units" ON public.dms_units;

CREATE POLICY "Admins can delete dms_units" ON public.dms_units
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert dms_units" ON public.dms_units
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update dms_units" ON public.dms_units
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- ora_activity_catalog
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.ora_activity_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.ora_activity_catalog;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.ora_activity_catalog;

CREATE POLICY "Admins can delete activities" ON public.ora_activity_catalog
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert activities" ON public.ora_activity_catalog
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update activities" ON public.ora_activity_catalog
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- ora_plan_templates
DROP POLICY IF EXISTS "Authenticated users can delete ora_plan_templates" ON public.ora_plan_templates;
DROP POLICY IF EXISTS "Authenticated users can insert ora_plan_templates" ON public.ora_plan_templates;
DROP POLICY IF EXISTS "Authenticated users can update ora_plan_templates" ON public.ora_plan_templates;

CREATE POLICY "Admins can delete ora_plan_templates" ON public.ora_plan_templates
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert ora_plan_templates" ON public.ora_plan_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update ora_plan_templates" ON public.ora_plan_templates
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- ora_training_system_mappings
DROP POLICY IF EXISTS "Authenticated users can delete training system mappings" ON public.ora_training_system_mappings;
DROP POLICY IF EXISTS "Authenticated users can insert training system mappings" ON public.ora_training_system_mappings;
DROP POLICY IF EXISTS "Authenticated users can update training system mappings" ON public.ora_training_system_mappings;

CREATE POLICY "Admins can delete training system mappings" ON public.ora_training_system_mappings
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert training system mappings" ON public.ora_training_system_mappings
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update training system mappings" ON public.ora_training_system_mappings
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- project_hub_region
DROP POLICY IF EXISTS "Allow authenticated users to manage hub regions" ON public.project_hub_region;

CREATE POLICY "Admins can manage hub regions" ON public.project_hub_region
  FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));

-- project_locations
DROP POLICY IF EXISTS "Users can delete project locations" ON public.project_locations;
DROP POLICY IF EXISTS "Users can insert project locations" ON public.project_locations;
DROP POLICY IF EXISTS "Users can update project locations" ON public.project_locations;

CREATE POLICY "Admins can delete project locations" ON public.project_locations
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can insert project locations" ON public.project_locations
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update project locations" ON public.project_locations
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator'));


-- ============================================================
-- TIER 2: Permission-gated operational tables
-- ============================================================

-- p2a_vcr_critical_docs (was FOR ALL with USING true)
DROP POLICY IF EXISTS "Authenticated users can manage critical docs" ON public.p2a_vcr_critical_docs;

CREATE POLICY "P2A users can select critical docs" ON public.p2a_vcr_critical_docs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage critical docs" ON public.p2a_vcr_critical_docs
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_deliverables (was public role)
DROP POLICY IF EXISTS "Authenticated users can manage VCR deliverables" ON public.p2a_vcr_deliverables;

CREATE POLICY "P2A users can select VCR deliverables" ON public.p2a_vcr_deliverables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage VCR deliverables" ON public.p2a_vcr_deliverables
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_documentation (was public role)
DROP POLICY IF EXISTS "Authenticated users can manage VCR documentation" ON public.p2a_vcr_documentation;

CREATE POLICY "P2A users can select VCR documentation" ON public.p2a_vcr_documentation
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage VCR documentation" ON public.p2a_vcr_documentation
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_item_overrides
DROP POLICY IF EXISTS "Authenticated users can delete overrides" ON public.p2a_vcr_item_overrides;
DROP POLICY IF EXISTS "Authenticated users can insert overrides" ON public.p2a_vcr_item_overrides;
DROP POLICY IF EXISTS "Authenticated users can update overrides" ON public.p2a_vcr_item_overrides;

CREATE POLICY "P2A users can delete overrides" ON public.p2a_vcr_item_overrides
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can insert overrides" ON public.p2a_vcr_item_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can update overrides" ON public.p2a_vcr_item_overrides
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_logsheets (was FOR ALL with USING true)
DROP POLICY IF EXISTS "Authenticated users can manage logsheets" ON public.p2a_vcr_logsheets;

CREATE POLICY "P2A users can select logsheets" ON public.p2a_vcr_logsheets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage logsheets" ON public.p2a_vcr_logsheets
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_operational_registers (was public role)
DROP POLICY IF EXISTS "Authenticated users can manage VCR operational registers" ON public.p2a_vcr_operational_registers;

CREATE POLICY "P2A users can select VCR operational registers" ON public.p2a_vcr_operational_registers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage VCR operational registers" ON public.p2a_vcr_operational_registers
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_procedures (was public role)
DROP POLICY IF EXISTS "Authenticated users can manage VCR procedures" ON public.p2a_vcr_procedures;

CREATE POLICY "P2A users can select VCR procedures" ON public.p2a_vcr_procedures
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage VCR procedures" ON public.p2a_vcr_procedures
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_register_selections (was FOR ALL with USING true)
DROP POLICY IF EXISTS "Authenticated users can manage register selections" ON public.p2a_vcr_register_selections;

CREATE POLICY "P2A users can select register selections" ON public.p2a_vcr_register_selections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage register selections" ON public.p2a_vcr_register_selections
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_relationships
DROP POLICY IF EXISTS "Authenticated users can delete VCR relationships" ON public.p2a_vcr_relationships;
DROP POLICY IF EXISTS "Authenticated users can create VCR relationships" ON public.p2a_vcr_relationships;

CREATE POLICY "P2A users can delete VCR relationships" ON public.p2a_vcr_relationships
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can create VCR relationships" ON public.p2a_vcr_relationships
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_vcr_training (was public role)
DROP POLICY IF EXISTS "Authenticated users can manage VCR training" ON public.p2a_vcr_training;

CREATE POLICY "P2A users can select VCR training" ON public.p2a_vcr_training
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "P2A users can manage VCR training" ON public.p2a_vcr_training
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- vcr_discipline_assurance
DROP POLICY IF EXISTS "Authenticated users can insert assurance statements" ON public.vcr_discipline_assurance;

CREATE POLICY "P2A users can insert assurance statements" ON public.vcr_discipline_assurance
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- vcr_item_delivering_parties
DROP POLICY IF EXISTS "Authenticated users can remove delivering parties" ON public.vcr_item_delivering_parties;
DROP POLICY IF EXISTS "Authenticated users can add delivering parties" ON public.vcr_item_delivering_parties;

CREATE POLICY "P2A users can remove delivering parties" ON public.vcr_item_delivering_parties
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can add delivering parties" ON public.vcr_item_delivering_parties
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_itp_activities
DROP POLICY IF EXISTS "Authenticated users can delete ITP activities" ON public.p2a_itp_activities;
DROP POLICY IF EXISTS "Authenticated users can insert ITP activities" ON public.p2a_itp_activities;
DROP POLICY IF EXISTS "Authenticated users can update ITP activities" ON public.p2a_itp_activities;

CREATE POLICY "P2A users can delete ITP activities" ON public.p2a_itp_activities
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can insert ITP activities" ON public.p2a_itp_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));
CREATE POLICY "P2A users can update ITP activities" ON public.p2a_itp_activities
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));

-- p2a_approver_history (INSERT only, append-only)
DROP POLICY IF EXISTS "Authenticated users can insert approver history" ON public.p2a_approver_history;

CREATE POLICY "P2A users can insert approver history" ON public.p2a_approver_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- outstanding_work_items
DROP POLICY IF EXISTS "Authenticated users can update OWL items" ON public.outstanding_work_items;

CREATE POLICY "P2A users can update OWL items" ON public.outstanding_work_items
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'));

-- pac_prerequisite_delivering_parties (was FOR ALL with USING true)
DROP POLICY IF EXISTS "Authenticated users can manage PAC prerequisite delivering part" ON public.pac_prerequisite_delivering_parties;

CREATE POLICY "P2A users can manage PAC prerequisite delivering parties" ON public.pac_prerequisite_delivering_parties
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- pac_prerequisite_receiving_parties (was FOR ALL with USING true)
DROP POLICY IF EXISTS "Authenticated users can manage PAC prerequisite receiving parti" ON public.pac_prerequisite_receiving_parties;

CREATE POLICY "P2A users can manage PAC prerequisite receiving parties" ON public.pac_prerequisite_receiving_parties
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_p2a'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- ORM tables
DROP POLICY IF EXISTS "System can create ORM notifications" ON public.orm_notifications;
DROP POLICY IF EXISTS "Users can create ORM plans" ON public.orm_plans;

CREATE POLICY "ORM users can create notifications" ON public.orm_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_orm'));
CREATE POLICY "ORM users can create plans" ON public.orm_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_orm'));

-- PSSR tables (was public role)
DROP POLICY IF EXISTS "Users can create pssr approvers" ON public.pssr_approvers;

CREATE POLICY "PSSR users can create approvers" ON public.pssr_approvers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'create_pssr'));

DROP POLICY IF EXISTS "Authenticated users can delete their own selected ATI scopes" ON public.pssr_selected_ati_scopes;
DROP POLICY IF EXISTS "Authenticated users can insert selected ATI scopes" ON public.pssr_selected_ati_scopes;

CREATE POLICY "PSSR users can delete ATI scopes" ON public.pssr_selected_ati_scopes
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'create_pssr'));
CREATE POLICY "PSSR users can insert ATI scopes" ON public.pssr_selected_ati_scopes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'create_pssr'));

-- pssr_walkdown_attendees (was public role)
DROP POLICY IF EXISTS "Users can delete walkdown attendees" ON public.pssr_walkdown_attendees;
DROP POLICY IF EXISTS "Users can insert walkdown attendees" ON public.pssr_walkdown_attendees;
DROP POLICY IF EXISTS "Users can update walkdown attendees" ON public.pssr_walkdown_attendees;

CREATE POLICY "PSSR users can delete walkdown attendees" ON public.pssr_walkdown_attendees
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'create_pssr'));
CREATE POLICY "PSSR users can insert walkdown attendees" ON public.pssr_walkdown_attendees
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'create_pssr'));
CREATE POLICY "PSSR users can update walkdown attendees" ON public.pssr_walkdown_attendees
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'create_pssr'));

-- SOF tables (was public role)
DROP POLICY IF EXISTS "Users can create SoF approvers" ON public.sof_approvers;
DROP POLICY IF EXISTS "Users can create SoF certificates" ON public.sof_certificates;
DROP POLICY IF EXISTS "Users can update SoF certificates" ON public.sof_certificates;

CREATE POLICY "SOF users can create approvers" ON public.sof_approvers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'approve_sof'));
CREATE POLICY "SOF users can create certificates" ON public.sof_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'approve_sof'));
CREATE POLICY "SOF users can update certificates" ON public.sof_certificates
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'approve_sof'));


-- ============================================================
-- TIER 3: System/audit tables — fix public role targets
-- ============================================================

-- p2a_audit_trail: change from public to authenticated + manage_p2a for user inserts
-- Keep service_role bypass for edge functions
DROP POLICY IF EXISTS "System can create audit trail entries" ON public.p2a_audit_trail;

CREATE POLICY "P2A users can create audit trail entries" ON public.p2a_audit_trail
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_p2a'));

-- orp_activity_log: change from public to service_role
DROP POLICY IF EXISTS "System can create activity logs" ON public.orp_activity_log;

CREATE POLICY "Service role can create activity logs" ON public.orp_activity_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- orp_approval_history: change from public to service_role
DROP POLICY IF EXISTS "System can insert ORP approval history" ON public.orp_approval_history;

CREATE POLICY "Service role can insert ORP approval history" ON public.orp_approval_history
  FOR INSERT TO service_role
  WITH CHECK (true);
