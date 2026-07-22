-- Phase A: retire the p2a_vcr_prerequisites.evidence_links denorm.
-- Pre-flight confirmed empty across ALL projects (0/163 rows non-empty).
-- p2a_vcr_evidence is now the single source of truth for VCR evidence.

-- Snapshot (advisory) so we can prove intent if needed after the drop.
DO $$
BEGIN
  RAISE NOTICE 'INT-1 Phase A snapshot: dropping p2a_vcr_prerequisites.evidence_links (was 0/163 non-empty)';
END $$;

ALTER TABLE public.p2a_vcr_prerequisites DROP COLUMN IF EXISTS evidence_links;