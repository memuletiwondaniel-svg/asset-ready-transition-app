
DROP INDEX IF EXISTS public.p2a_vcr_evidence_assai_unique;

ALTER TABLE public.p2a_vcr_evidence ALTER COLUMN source DROP DEFAULT;
ALTER TABLE public.p2a_vcr_evidence
  ALTER COLUMN source TYPE public.p2a_evidence_source
  USING (
    CASE COALESCE(NULLIF(source,''), 'manual')
      WHEN 'manual' THEN 'manual'::public.p2a_evidence_source
      WHEN 'assai' THEN 'assai'::public.p2a_evidence_source
      WHEN 'uploaded' THEN 'uploaded'::public.p2a_evidence_source
      WHEN 'promoted_procedure' THEN 'promoted_procedure'::public.p2a_evidence_source
      WHEN 'promoted_training' THEN 'promoted_training'::public.p2a_evidence_source
      WHEN 'promoted_register' THEN 'promoted_register'::public.p2a_evidence_source
      WHEN 'promoted_maintenance' THEN 'promoted_maintenance'::public.p2a_evidence_source
      ELSE 'manual'::public.p2a_evidence_source
    END
  );
ALTER TABLE public.p2a_vcr_evidence ALTER COLUMN source SET DEFAULT 'manual'::public.p2a_evidence_source;
ALTER TABLE public.p2a_vcr_evidence ALTER COLUMN source SET NOT NULL;

CREATE UNIQUE INDEX p2a_vcr_evidence_assai_unique
  ON public.p2a_vcr_evidence (vcr_prerequisite_id, assai_doc_no, assai_rev)
  WHERE source = 'assai'::public.p2a_evidence_source AND assai_doc_no IS NOT NULL;

ALTER TABLE public.p2a_vcr_evidence
  ADD COLUMN evidence_kind public.p2a_evidence_kind NOT NULL DEFAULT 'other'::public.p2a_evidence_kind;

CREATE INDEX IF NOT EXISTS idx_p2a_vcr_evidence_kind
  ON public.p2a_vcr_evidence (evidence_kind);

CREATE OR REPLACE FUNCTION public.classify_evidence_kind(
  p_file_name text,
  p_evidence_type text,
  p_source text
) RETURNS public.p2a_evidence_kind
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  hay text := lower(coalesce(p_file_name,'') || ' ' || coalesce(p_evidence_type,''));
BEGIN
  IF p_source = 'assai' THEN RETURN 'assai_document'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'red[-_ ]?line|markup|mark[-_ ]?up' THEN RETURN 'red_line_markup'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'attendance|sign[-_ ]?in|roster' THEN RETURN 'attendance_list'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'signed[-_ ]procedure|procedure.*signed|executed.*procedure' THEN RETURN 'signed_procedure'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'punch[-_ ]?list|punchlist' THEN RETURN 'punchlist_register'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'lolc|list of open|close[-_ ]?out.*register|hemp|hazop' THEN RETURN 'lolc_register'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'audit[-_ ]?action|audit register' THEN RETURN 'audit_actions_register'::public.p2a_evidence_kind; END IF;
  IF hay ~ 'qualification|qual\.?\s*letter|qualification letter' THEN RETURN 'qualification_letter'::public.p2a_evidence_kind; END IF;
  RETURN 'other'::public.p2a_evidence_kind;
END
$fn$;

UPDATE public.p2a_vcr_evidence
SET evidence_kind = public.classify_evidence_kind(file_name, evidence_type, source::text);

CREATE OR REPLACE FUNCTION public.p2a_vcr_evidence_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.evidence_kind IS NULL OR NEW.evidence_kind = 'other'::public.p2a_evidence_kind THEN
    NEW.evidence_kind := public.classify_evidence_kind(NEW.file_name, NEW.evidence_type, NEW.source::text);
  END IF;
  IF NEW.source = 'assai'::public.p2a_evidence_source
     AND (NEW.assai_doc_no IS NULL OR btrim(NEW.assai_doc_no) = '') THEN
    RAISE EXCEPTION 'p2a_vcr_evidence: source=assai requires assai_doc_no'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS p2a_vcr_evidence_normalize_trg ON public.p2a_vcr_evidence;
CREATE TRIGGER p2a_vcr_evidence_normalize_trg
  BEFORE INSERT OR UPDATE ON public.p2a_vcr_evidence
  FOR EACH ROW EXECUTE FUNCTION public.p2a_vcr_evidence_normalize();
