-- ============================================================
-- FIX 1: Replace all RLS policies that reference 'moderator' 
-- (which is not a valid user_role enum value) with 'manager'
-- This affects ALL DMS tables and was causing save errors.
-- ============================================================

-- dms_disciplines
DROP POLICY IF EXISTS "Admins can delete disciplines" ON public.dms_disciplines;
DROP POLICY IF EXISTS "Admins can insert disciplines" ON public.dms_disciplines;
DROP POLICY IF EXISTS "Admins can update disciplines" ON public.dms_disciplines;

CREATE POLICY "Admins can delete disciplines" ON public.dms_disciplines
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert disciplines" ON public.dms_disciplines
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update disciplines" ON public.dms_disciplines
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_document_type_secondary_disciplines
DROP POLICY IF EXISTS "Admins can delete secondary disciplines" ON public.dms_document_type_secondary_disciplines;
DROP POLICY IF EXISTS "Admins can insert secondary disciplines" ON public.dms_document_type_secondary_disciplines;

CREATE POLICY "Admins can delete secondary disciplines" ON public.dms_document_type_secondary_disciplines
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert secondary disciplines" ON public.dms_document_type_secondary_disciplines
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_document_types
DROP POLICY IF EXISTS "Admins can delete document types" ON public.dms_document_types;
DROP POLICY IF EXISTS "Admins can insert document types" ON public.dms_document_types;
DROP POLICY IF EXISTS "Admins can update document types" ON public.dms_document_types;

CREATE POLICY "Admins can delete document types" ON public.dms_document_types
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert document types" ON public.dms_document_types
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update document types" ON public.dms_document_types
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_numbering_segments
DROP POLICY IF EXISTS "Admins can insert numbering segments" ON public.dms_numbering_segments;

CREATE POLICY "Admins can insert numbering segments" ON public.dms_numbering_segments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_originators
DROP POLICY IF EXISTS "Admins can delete dms_originators" ON public.dms_originators;
DROP POLICY IF EXISTS "Admins can insert dms_originators" ON public.dms_originators;
DROP POLICY IF EXISTS "Admins can update dms_originators" ON public.dms_originators;

CREATE POLICY "Admins can delete dms_originators" ON public.dms_originators
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_originators" ON public.dms_originators
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_originators" ON public.dms_originators
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_plants
DROP POLICY IF EXISTS "Admins can delete dms_plants" ON public.dms_plants;
DROP POLICY IF EXISTS "Admins can insert dms_plants" ON public.dms_plants;
DROP POLICY IF EXISTS "Admins can update dms_plants" ON public.dms_plants;

CREATE POLICY "Admins can delete dms_plants" ON public.dms_plants
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_plants" ON public.dms_plants
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_plants" ON public.dms_plants
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_projects
DROP POLICY IF EXISTS "Admins can delete dms_projects" ON public.dms_projects;
DROP POLICY IF EXISTS "Admins can insert dms_projects" ON public.dms_projects;
DROP POLICY IF EXISTS "Admins can update dms_projects" ON public.dms_projects;

CREATE POLICY "Admins can delete dms_projects" ON public.dms_projects
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_projects" ON public.dms_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_projects" ON public.dms_projects
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_sites
DROP POLICY IF EXISTS "Admins can delete dms_sites" ON public.dms_sites;
DROP POLICY IF EXISTS "Admins can insert dms_sites" ON public.dms_sites;
DROP POLICY IF EXISTS "Admins can update dms_sites" ON public.dms_sites;

CREATE POLICY "Admins can delete dms_sites" ON public.dms_sites
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_sites" ON public.dms_sites
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_sites" ON public.dms_sites
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_status_codes
DROP POLICY IF EXISTS "Admins can delete dms_status_codes" ON public.dms_status_codes;
DROP POLICY IF EXISTS "Admins can insert dms_status_codes" ON public.dms_status_codes;
DROP POLICY IF EXISTS "Admins can update dms_status_codes" ON public.dms_status_codes;

CREATE POLICY "Admins can delete dms_status_codes" ON public.dms_status_codes
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_status_codes" ON public.dms_status_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_status_codes" ON public.dms_status_codes
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- dms_units
DROP POLICY IF EXISTS "Admins can delete dms_units" ON public.dms_units;
DROP POLICY IF EXISTS "Admins can insert dms_units" ON public.dms_units;
DROP POLICY IF EXISTS "Admins can update dms_units" ON public.dms_units;

CREATE POLICY "Admins can delete dms_units" ON public.dms_units
  FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert dms_units" ON public.dms_units
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update dms_units" ON public.dms_units
  FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'))
  WITH CHECK (public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'manager'));

-- ============================================================
-- FIX 2: Clean remaining single-letter prefixes from project names
-- Pattern: single capital letter followed by space at the start
-- ============================================================
UPDATE dms_projects
SET project_name = trim(regexp_replace(project_name, '^[A-Z] ', '', '')),
    updated_at = now()
WHERE project_name ~ '^[A-Z] ';