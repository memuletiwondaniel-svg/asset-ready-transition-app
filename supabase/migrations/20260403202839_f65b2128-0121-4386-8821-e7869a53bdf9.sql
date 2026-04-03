
-- =============================================
-- Phase 1: Selma VCR Document Intelligence Schema
-- =============================================

-- 1. Add DMS tracking columns to vcr_document_requirements
ALTER TABLE public.vcr_document_requirements
  ADD COLUMN assigned_document_number TEXT,
  ADD COLUMN rlmu_status TEXT DEFAULT 'not_applicable'
    CHECK (rlmu_status IN ('not_applicable','pending','uploaded','under_review','approved','rejected')),
  ADD COLUMN rlmu_file_path TEXT,
  ADD COLUMN rlmu_reviewed_at TIMESTAMPTZ,
  ADD COLUMN rlmu_review_findings JSONB,
  ADD COLUMN dms_status TEXT;

-- 2. Add DMS tracking columns to p2a_vcr_register_selections
ALTER TABLE public.p2a_vcr_register_selections
  ADD COLUMN document_number TEXT,
  ADD COLUMN document_type_code TEXT,
  ADD COLUMN dms_status TEXT,
  ADD COLUMN rlmu_status TEXT DEFAULT 'not_applicable'
    CHECK (rlmu_status IN ('not_applicable','pending','uploaded','under_review','approved','rejected')),
  ADD COLUMN rlmu_file_path TEXT;

-- 3. Add DMS tracking columns to p2a_vcr_logsheets
ALTER TABLE public.p2a_vcr_logsheets
  ADD COLUMN document_number TEXT,
  ADD COLUMN document_type_code TEXT,
  ADD COLUMN dms_status TEXT,
  ADD COLUMN rlmu_status TEXT DEFAULT 'not_applicable'
    CHECK (rlmu_status IN ('not_applicable','pending','uploaded','under_review','approved','rejected')),
  ADD COLUMN rlmu_file_path TEXT;

-- 4. Create rlmu_reviews table (polymorphic: covers all 3 deliverable types)
CREATE TABLE public.rlmu_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL CHECK (source_table IN ('vcr_document_requirements', 'p2a_vcr_register_selections', 'p2a_vcr_logsheets')),
  source_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'needs_review')),
  findings JSONB DEFAULT '[]'::jsonb,
  reviewed_by TEXT DEFAULT 'selma',
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rlmu_reviews_source ON public.rlmu_reviews(source_table, source_id);

ALTER TABLE public.rlmu_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view RLMU reviews"
  ON public.rlmu_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert RLMU reviews"
  ON public.rlmu_reviews FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Create dms_reserved_numbers table
CREATE TABLE public.dms_reserved_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL UNIQUE,
  document_type_code TEXT NOT NULL,
  discipline_code TEXT,
  unit_code TEXT DEFAULT 'G00000',
  package_tag TEXT,
  reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'assigned', 'released')),
  source_table TEXT,
  source_id UUID,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dms_reserved_numbers_project ON public.dms_reserved_numbers(project_id, document_type_code);
CREATE INDEX idx_dms_reserved_numbers_status ON public.dms_reserved_numbers(status);

ALTER TABLE public.dms_reserved_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reserved numbers"
  ON public.dms_reserved_numbers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reserved numbers"
  ON public.dms_reserved_numbers FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update reserved numbers"
  ON public.dms_reserved_numbers FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- 6. Create rlmu-uploads storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rlmu-uploads', 'rlmu-uploads', false);

CREATE POLICY "Authenticated users can upload RLMU files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rlmu-uploads');

CREATE POLICY "Authenticated users can view RLMU files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rlmu-uploads');

CREATE POLICY "Service role can read RLMU files for AI review"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'rlmu-uploads');

-- 7. Trigger: auto-set rlmu_status = 'pending' when linked doc type has rlmu = 'Yes'
CREATE OR REPLACE FUNCTION public.auto_set_rlmu_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rlmu TEXT;
BEGIN
  -- Only applies to vcr_document_requirements which has document_type_id
  IF TG_TABLE_NAME = 'vcr_document_requirements' AND NEW.document_type_id IS NOT NULL THEN
    SELECT rlmu INTO v_rlmu
    FROM dms_document_types
    WHERE id = NEW.document_type_id;

    IF v_rlmu = 'Yes' THEN
      NEW.rlmu_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_set_rlmu_status
  BEFORE INSERT ON public.vcr_document_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_rlmu_status();
