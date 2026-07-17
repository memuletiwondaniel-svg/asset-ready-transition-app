
-- Assai revision fields
ALTER TABLE public.p2a_vcr_critical_docs
  ADD COLUMN IF NOT EXISTS assai_status_code text,
  ADD COLUMN IF NOT EXISTS assai_revision    text;

-- Normalise rlmu_status vocabulary
UPDATE public.p2a_vcr_critical_docs
   SET rlmu_status = 'under_review'
 WHERE rlmu_status IN ('uploaded','submitted');

-- Enforce canonical rlmu_status values (drop old check if any)
DO $$ BEGIN
  ALTER TABLE public.p2a_vcr_critical_docs DROP CONSTRAINT IF EXISTS p2a_vcr_critical_docs_rlmu_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.p2a_vcr_critical_docs
  ADD CONSTRAINT p2a_vcr_critical_docs_rlmu_status_check
  CHECK (rlmu_status IS NULL OR rlmu_status IN ('not_required','pending','under_review','approved','rejected'));

-- Backfill tier from catalog where NULL
UPDATE public.p2a_vcr_critical_docs d
   SET tier = c.tier
  FROM public.p2a_vcr_doc_catalog c
 WHERE d.catalog_id = c.id
   AND d.tier IS NULL
   AND c.tier IS NOT NULL;

-- Force rlmu_required=true for all Tier 1 rows
UPDATE public.p2a_vcr_critical_docs
   SET rlmu_required = true
 WHERE tier = 'tier_1'
   AND rlmu_required IS DISTINCT FROM true;

-- If a Tier 1 row was previously not_required, promote to pending so seed logic can chip it
UPDATE public.p2a_vcr_critical_docs
   SET rlmu_status = 'pending'
 WHERE tier = 'tier_1'
   AND (rlmu_status IS NULL OR rlmu_status = 'not_required');
