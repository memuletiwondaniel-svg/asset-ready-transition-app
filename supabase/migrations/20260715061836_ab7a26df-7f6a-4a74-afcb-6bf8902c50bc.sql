
ALTER TABLE public.p2a_vcr_qualifications
  ADD COLUMN IF NOT EXISTS custom_title text;

ALTER TABLE public.p2a_vcr_qualifications
  ALTER COLUMN vcr_prerequisite_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_qualification_prereq_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prereq_hp uuid;
BEGIN
  IF NEW.handover_point_id IS NULL THEN
    RAISE EXCEPTION 'Qualification requires handover_point_id';
  END IF;

  IF NEW.vcr_prerequisite_id IS NULL THEN
    -- Custom qualification (no VCR item) — allowed; require a title for clarity.
    IF NEW.custom_title IS NULL OR btrim(NEW.custom_title) = '' THEN
      RAISE EXCEPTION 'Custom qualification (no vcr_prerequisite_id) requires custom_title';
    END IF;
    RETURN NEW;
  END IF;

  SELECT handover_point_id INTO prereq_hp
  FROM public.p2a_vcr_prerequisites
  WHERE id = NEW.vcr_prerequisite_id;

  IF prereq_hp IS NULL THEN
    RAISE EXCEPTION 'Prerequisite % not found', NEW.vcr_prerequisite_id;
  END IF;

  IF NEW.handover_point_id <> prereq_hp THEN
    RAISE EXCEPTION 'Qualification handover_point_id (%) does not match prerequisite handover_point_id (%)',
      NEW.handover_point_id, prereq_hp;
  END IF;

  RETURN NEW;
END;
$$;
