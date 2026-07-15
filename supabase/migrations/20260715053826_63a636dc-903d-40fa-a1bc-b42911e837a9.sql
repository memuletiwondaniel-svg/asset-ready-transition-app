
-- Backfill (defensive; currently 0 rows affected)
UPDATE public.p2a_vcr_qualifications q
SET handover_point_id = p.handover_point_id
FROM public.p2a_vcr_prerequisites p
WHERE p.id = q.vcr_prerequisite_id
  AND (q.handover_point_id IS NULL OR q.handover_point_id IS DISTINCT FROM p.handover_point_id);

-- Integrity trigger: prereq must exist and be on the same handover point.
CREATE OR REPLACE FUNCTION public.enforce_qualification_prereq_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prereq_hp uuid;
BEGIN
  IF NEW.vcr_prerequisite_id IS NULL THEN
    RAISE EXCEPTION 'Qualification requires vcr_prerequisite_id';
  END IF;

  SELECT handover_point_id INTO prereq_hp
  FROM public.p2a_vcr_prerequisites
  WHERE id = NEW.vcr_prerequisite_id;

  IF prereq_hp IS NULL THEN
    RAISE EXCEPTION 'Prerequisite % not found', NEW.vcr_prerequisite_id;
  END IF;

  IF NEW.handover_point_id IS NULL THEN
    NEW.handover_point_id := prereq_hp;
  ELSIF NEW.handover_point_id <> prereq_hp THEN
    RAISE EXCEPTION 'Qualification handover_point_id (%) does not match prerequisite handover_point_id (%)',
      NEW.handover_point_id, prereq_hp;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qualification_prereq_integrity ON public.p2a_vcr_qualifications;
CREATE TRIGGER trg_qualification_prereq_integrity
BEFORE INSERT OR UPDATE OF vcr_prerequisite_id, handover_point_id
ON public.p2a_vcr_qualifications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_qualification_prereq_integrity();
