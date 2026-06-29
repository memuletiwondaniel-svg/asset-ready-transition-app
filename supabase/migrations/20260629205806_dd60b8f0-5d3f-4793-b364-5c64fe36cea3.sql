
-- Provenance fields on the requirement (p2a_vcr_prerequisites) → doc-number-first resolution
ALTER TABLE public.p2a_vcr_prerequisites
  ADD COLUMN IF NOT EXISTS assai_doc_no text,
  ADD COLUMN IF NOT EXISTS assai_rev text;

-- Provenance + confirmation fields on evidence (p2a_vcr_evidence)
ALTER TABLE public.p2a_vcr_evidence
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS assai_doc_no text,
  ADD COLUMN IF NOT EXISTS assai_rev text,
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Source must be one of {manual, assai}; manual rows stay confirmed=true (UI behaviour unchanged),
-- assai rows default to confirmed=false at insert time (set explicitly by the fetch function).
ALTER TABLE public.p2a_vcr_evidence
  DROP CONSTRAINT IF EXISTS p2a_vcr_evidence_source_check;
ALTER TABLE public.p2a_vcr_evidence
  ADD CONSTRAINT p2a_vcr_evidence_source_check
  CHECK (source IN ('manual','assai'));

-- Dedup: at most one Assai row per (prereq, doc_no, rev). Allows re-fetches as no-ops.
CREATE UNIQUE INDEX IF NOT EXISTS p2a_vcr_evidence_assai_unique
  ON public.p2a_vcr_evidence (vcr_prerequisite_id, assai_doc_no, assai_rev)
  WHERE source = 'assai' AND assai_doc_no IS NOT NULL;

-- Seed the DP-300 DI-03 (HEMP) requirement with the worked-example HAZOP close-out register.
UPDATE public.p2a_vcr_prerequisites p
SET assai_doc_no = '6529-WGEL-C017-ISGP-U40300-HX-5880-20501',
    assai_rev = '01I'
FROM vcr_items vi
JOIN vcr_item_categories vic ON vic.id = vi.category_id
JOIN p2a_handover_points hp ON true
JOIN p2a_handover_plans pl ON pl.id = hp.handover_plan_id
WHERE p.vcr_item_id = vi.id
  AND p.handover_point_id = hp.id
  AND vic.code = 'DI'
  AND vi.display_order = 3
  AND pl.project_code = 'DP-300'
  AND (p.assai_doc_no IS NULL OR p.assai_doc_no = '');
