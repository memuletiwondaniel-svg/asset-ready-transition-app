
-- 1. Milestones thresholds on competencies
ALTER TABLE public.competencies
  ADD COLUMN IF NOT EXISTS knowledge_threshold int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_threshold     int NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS mastery_threshold   int NOT NULL DEFAULT 100;

ALTER TABLE public.competencies
  DROP CONSTRAINT IF EXISTS competencies_thresholds_chk;
ALTER TABLE public.competencies
  ADD CONSTRAINT competencies_thresholds_chk
  CHECK (
    knowledge_threshold BETWEEN 0 AND 100
    AND skill_threshold BETWEEN 0 AND 100
    AND mastery_threshold BETWEEN 0 AND 100
    AND knowledge_threshold <= skill_threshold
    AND skill_threshold <= mastery_threshold
  );

-- 2. Weighting + sequencing on competence_activities
ALTER TABLE public.competence_activities
  ADD COLUMN IF NOT EXISTS weight              int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sequence_order      int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sequence_strict  boolean NOT NULL DEFAULT false;

ALTER TABLE public.competence_activities
  DROP CONSTRAINT IF EXISTS competence_activities_weight_chk;
ALTER TABLE public.competence_activities
  ADD CONSTRAINT competence_activities_weight_chk
  CHECK (weight BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_competence_activities_competency_seq
  ON public.competence_activities (competency_id, sequence_order);

-- 3. Recompute progress trigger
CREATE OR REPLACE FUNCTION public.cms_recalc_competency_progress(
  p_person_id uuid,
  p_competency_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress int;
  v_kt int;
  v_st int;
  v_mt int;
  v_status cms_progress_status;
BEGIN
  SELECT COALESCE(SUM(ca.weight), 0)
  INTO v_progress
  FROM person_activity_records par
  JOIN competence_activities ca ON ca.id = par.activity_id
  WHERE par.person_id = p_person_id
    AND ca.competency_id = p_competency_id
    AND par.status = 'completed';

  IF v_progress > 100 THEN v_progress := 100; END IF;

  SELECT knowledge_threshold, skill_threshold, mastery_threshold
  INTO v_kt, v_st, v_mt
  FROM competencies WHERE id = p_competency_id;

  v_status := CASE
    WHEN v_progress >= COALESCE(v_mt, 100) THEN 'competent'::cms_progress_status
    WHEN v_progress >= COALESCE(v_kt, 50)  THEN 'assessed'::cms_progress_status
    WHEN v_progress > 0                    THEN 'in_progress'::cms_progress_status
    ELSE 'not_started'::cms_progress_status
  END;

  INSERT INTO person_competency_progress (person_id, competency_id, progress, status, last_assessed_at)
  VALUES (p_person_id, p_competency_id, v_progress, v_status, now())
  ON CONFLICT (person_id, competency_id)
  DO UPDATE SET
    progress = EXCLUDED.progress,
    status = EXCLUDED.status,
    last_assessed_at = now(),
    updated_at = now();
END;
$$;

-- Make sure unique constraint exists for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'person_competency_progress_person_competency_uniq'
  ) THEN
    ALTER TABLE public.person_competency_progress
      ADD CONSTRAINT person_competency_progress_person_competency_uniq
      UNIQUE (person_id, competency_id);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.trg_cms_recalc_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp uuid;
  v_person uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT competency_id INTO v_comp FROM competence_activities WHERE id = OLD.activity_id;
    v_person := OLD.person_id;
  ELSE
    SELECT competency_id INTO v_comp FROM competence_activities WHERE id = NEW.activity_id;
    v_person := NEW.person_id;
  END IF;

  IF v_comp IS NOT NULL THEN
    PERFORM public.cms_recalc_competency_progress(v_person, v_comp);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_progress ON public.person_activity_records;
CREATE TRIGGER trg_recalc_progress
AFTER INSERT OR UPDATE OR DELETE ON public.person_activity_records
FOR EACH ROW EXECUTE FUNCTION public.trg_cms_recalc_progress();

-- 4. Strict sequence enforcement
CREATE OR REPLACE FUNCTION public.trg_cms_enforce_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strict boolean;
  v_comp uuid;
  v_seq int;
  v_blocking int;
BEGIN
  IF NEW.status NOT IN ('in_progress', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT is_sequence_strict, competency_id, sequence_order
  INTO v_strict, v_comp, v_seq
  FROM competence_activities WHERE id = NEW.activity_id;

  IF NOT COALESCE(v_strict, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_blocking
  FROM competence_activities ca
  LEFT JOIN person_activity_records par
    ON par.activity_id = ca.id AND par.person_id = NEW.person_id
  WHERE ca.competency_id = v_comp
    AND ca.sequence_order < v_seq
    AND (par.status IS NULL OR par.status <> 'completed');

  IF v_blocking > 0 THEN
    RAISE EXCEPTION 'Cannot start activity: % earlier activity(ies) must be completed first', v_blocking
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sequence ON public.person_activity_records;
CREATE TRIGGER trg_enforce_sequence
BEFORE INSERT OR UPDATE ON public.person_activity_records
FOR EACH ROW EXECUTE FUNCTION public.trg_cms_enforce_sequence();

-- 5. Weight sum validation (warning only)
CREATE OR REPLACE FUNCTION public.trg_cms_validate_weights()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_comp uuid;
  v_sum int;
BEGIN
  v_comp := COALESCE(NEW.competency_id, OLD.competency_id);
  SELECT COALESCE(SUM(weight), 0) INTO v_sum
  FROM competence_activities WHERE competency_id = v_comp;
  IF v_sum <> 100 THEN
    RAISE NOTICE 'Competency % activity weights sum to %, expected 100', v_comp, v_sum;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_weights ON public.competence_activities;
CREATE TRIGGER trg_validate_weights
AFTER INSERT OR UPDATE OR DELETE ON public.competence_activities
FOR EACH ROW EXECUTE FUNCTION public.trg_cms_validate_weights();

-- 6. Backfill weights and sequence on existing activities
WITH ranked AS (
  SELECT id, competency_id,
         ROW_NUMBER() OVER (PARTITION BY competency_id ORDER BY created_at, id) AS rn,
         COUNT(*) OVER (PARTITION BY competency_id) AS cnt
  FROM competence_activities
)
UPDATE competence_activities ca
SET weight = CASE WHEN r.cnt = 0 THEN 0 ELSE FLOOR(100.0 / r.cnt)::int END,
    sequence_order = r.rn
FROM ranked r
WHERE ca.id = r.id
  AND (ca.weight = 0 OR ca.sequence_order = 0);

-- Distribute remainder so each competency sums to 100
WITH sums AS (
  SELECT competency_id, SUM(weight) AS s, COUNT(*) AS cnt
  FROM competence_activities GROUP BY competency_id
), first_row AS (
  SELECT ca.id, (100 - s.s) AS extra
  FROM competence_activities ca
  JOIN sums s ON s.competency_id = ca.competency_id
  WHERE ca.sequence_order = 1 AND s.s <> 100 AND s.cnt > 0
)
UPDATE competence_activities ca
SET weight = ca.weight + fr.extra
FROM first_row fr WHERE ca.id = fr.id;

-- 7. Recompute existing progress
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT par.person_id, ca.competency_id
           FROM person_activity_records par
           JOIN competence_activities ca ON ca.id = par.activity_id
  LOOP
    PERFORM public.cms_recalc_competency_progress(r.person_id, r.competency_id);
  END LOOP;
END$$;
