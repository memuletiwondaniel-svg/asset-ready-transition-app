
-- ============================================================
-- INT-1 Phase C: lifecycle -> evidence promotion
-- ============================================================

-- 1. Back-pointer columns ------------------------------------------------
ALTER TABLE public.p2a_vcr_procedure_attachments
  ADD COLUMN IF NOT EXISTS promoted_evidence_id uuid
    REFERENCES public.p2a_vcr_evidence(id) ON DELETE SET NULL;

ALTER TABLE public.p2a_vcr_training_attachments
  ADD COLUMN IF NOT EXISTS promoted_evidence_id uuid
    REFERENCES public.p2a_vcr_evidence(id) ON DELETE SET NULL;

ALTER TABLE public.p2a_vcr_register_attachments
  ADD COLUMN IF NOT EXISTS promoted_evidence_id uuid
    REFERENCES public.p2a_vcr_evidence(id) ON DELETE SET NULL;

ALTER TABLE public.p2a_vcr_maint_attachments
  ADD COLUMN IF NOT EXISTS promoted_evidence_id uuid
    REFERENCES public.p2a_vcr_evidence(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proc_att_promoted ON public.p2a_vcr_procedure_attachments(promoted_evidence_id) WHERE promoted_evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_train_att_promoted ON public.p2a_vcr_training_attachments(promoted_evidence_id) WHERE promoted_evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_att_promoted ON public.p2a_vcr_register_attachments(promoted_evidence_id) WHERE promoted_evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maint_att_promoted ON public.p2a_vcr_maint_attachments(promoted_evidence_id) WHERE promoted_evidence_id IS NOT NULL;

-- 2. OI prereq resolver --------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_oi_prereq(
  p_handover_point_id uuid,
  p_topic text
) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id
  FROM public.p2a_vcr_prerequisites p
  JOIN public.vcr_items i ON i.id = p.vcr_item_id
  WHERE p.handover_point_id = p_handover_point_id
    AND i.topic = p_topic
  ORDER BY p.display_order NULLS LAST, p.created_at
  LIMIT 1;
$$;

-- 3. Promotion RPC (idempotent) -----------------------------------------
CREATE OR REPLACE FUNCTION public.promote_attachment_to_evidence(
  p_kind text,                   -- 'procedure' | 'training' | 'register' | 'maintenance'
  p_attachment_id uuid,
  p_prerequisite_id uuid,
  p_evidence_kind public.p2a_evidence_kind
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
  v_file_name text;
  v_file_path text;
  v_file_size bigint;
  v_file_type text;
  v_uploaded_by uuid;
  v_source public.p2a_evidence_source;
BEGIN
  IF p_kind NOT IN ('procedure','training','register','maintenance') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING ERRCODE = '22023';
  END IF;
  IF p_prerequisite_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_source := ('promoted_' || p_kind)::public.p2a_evidence_source;

  IF p_kind = 'procedure' THEN
    SELECT promoted_evidence_id, file_name, file_url, file_size, mime_type, uploaded_by
      INTO v_existing_id, v_file_name, v_file_path, v_file_size, v_file_type, v_uploaded_by
    FROM public.p2a_vcr_procedure_attachments WHERE id = p_attachment_id;
  ELSIF p_kind = 'training' THEN
    SELECT promoted_evidence_id, file_name, file_path, file_size, file_type, uploaded_by
      INTO v_existing_id, v_file_name, v_file_path, v_file_size, v_file_type, v_uploaded_by
    FROM public.p2a_vcr_training_attachments WHERE id = p_attachment_id;
  ELSIF p_kind = 'register' THEN
    SELECT promoted_evidence_id, file_name, file_path, file_size, content_type, uploaded_by
      INTO v_existing_id, v_file_name, v_file_path, v_file_size, v_file_type, v_uploaded_by
    FROM public.p2a_vcr_register_attachments WHERE id = p_attachment_id;
  ELSE -- maintenance
    SELECT promoted_evidence_id, file_name, file_path, file_size, content_type, uploaded_by
      INTO v_existing_id, v_file_name, v_file_path, v_file_size, v_file_type, v_uploaded_by
    FROM public.p2a_vcr_maint_attachments WHERE id = p_attachment_id;
  END IF;

  IF v_file_name IS NULL THEN
    RETURN NULL; -- attachment not found
  END IF;

  -- Idempotent: if a back-pointer already exists, re-confirm and return it.
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.p2a_vcr_evidence SET confirmed = true WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.p2a_vcr_evidence(
    vcr_prerequisite_id, file_name, file_path, file_size, file_type,
    description, uploaded_by, evidence_type, source, evidence_kind, confirmed
  ) VALUES (
    p_prerequisite_id, v_file_name, v_file_path, v_file_size, v_file_type,
    'Auto-promoted from ' || p_kind, v_uploaded_by,
    v_file_type, v_source, p_evidence_kind, true
  ) RETURNING id INTO v_new_id;

  IF p_kind = 'procedure' THEN
    UPDATE public.p2a_vcr_procedure_attachments SET promoted_evidence_id = v_new_id WHERE id = p_attachment_id;
  ELSIF p_kind = 'training' THEN
    UPDATE public.p2a_vcr_training_attachments SET promoted_evidence_id = v_new_id WHERE id = p_attachment_id;
  ELSIF p_kind = 'register' THEN
    UPDATE public.p2a_vcr_register_attachments SET promoted_evidence_id = v_new_id WHERE id = p_attachment_id;
  ELSE
    UPDATE public.p2a_vcr_maint_attachments SET promoted_evidence_id = v_new_id WHERE id = p_attachment_id;
  END IF;

  RETURN v_new_id;
END;
$$;

-- 4. Auto-wire trigger: procedures ---------------------------------------
CREATE OR REPLACE FUNCTION public.trg_promote_procedure_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prereq_id uuid;
  r RECORD;
BEGIN
  -- On entering APPROVED: promote draft/markup attachments
  IF NEW.status = 'APPROVED'::procedure_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    v_prereq_id := public.find_oi_prereq(NEW.handover_point_id, 'Procedures');
    IF v_prereq_id IS NOT NULL THEN
      FOR r IN
        SELECT id FROM public.p2a_vcr_procedure_attachments
        WHERE procedure_id = NEW.id
          AND kind IN ('draft','markup')
          AND promoted_evidence_id IS NULL
      LOOP
        PERFORM public.promote_attachment_to_evidence(
          'procedure', r.id, v_prereq_id, 'signed_procedure'::public.p2a_evidence_kind
        );
      END LOOP;
    END IF;
  END IF;

  -- On leaving APPROVED: soft-hide previously promoted evidence
  IF OLD.status = 'APPROVED'::procedure_status
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.p2a_vcr_evidence e
       SET confirmed = false
      FROM public.p2a_vcr_procedure_attachments a
     WHERE a.procedure_id = NEW.id
       AND a.promoted_evidence_id = e.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_procedure_evidence ON public.p2a_vcr_procedures;
CREATE TRIGGER promote_procedure_evidence
  AFTER UPDATE OF status ON public.p2a_vcr_procedures
  FOR EACH ROW EXECUTE FUNCTION public.trg_promote_procedure_evidence();

-- 5. Auto-wire trigger: training -----------------------------------------
CREATE OR REPLACE FUNCTION public.trg_promote_training_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prereq_id uuid;
  r RECORD;
  v_kind public.p2a_evidence_kind;
BEGIN
  IF NEW.status = 'COMPLETED'::training_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    v_prereq_id := public.find_oi_prereq(NEW.handover_point_id, 'Training');
    IF v_prereq_id IS NOT NULL THEN
      FOR r IN
        SELECT id, kind FROM public.p2a_vcr_training_attachments
        WHERE training_id = NEW.id
          AND kind IN ('attendance','evidence')
          AND promoted_evidence_id IS NULL
      LOOP
        v_kind := CASE WHEN r.kind = 'attendance'
                       THEN 'attendance_list'::public.p2a_evidence_kind
                       ELSE 'other'::public.p2a_evidence_kind END;
        PERFORM public.promote_attachment_to_evidence(
          'training', r.id, v_prereq_id, v_kind
        );
      END LOOP;
    END IF;
  END IF;

  IF OLD.status = 'COMPLETED'::training_status
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.p2a_vcr_evidence e
       SET confirmed = false
      FROM public.p2a_vcr_training_attachments a
     WHERE a.training_id = NEW.id
       AND a.promoted_evidence_id = e.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_training_evidence ON public.p2a_vcr_training;
CREATE TRIGGER promote_training_evidence
  AFTER UPDATE OF status ON public.p2a_vcr_training
  FOR EACH ROW EXECUTE FUNCTION public.trg_promote_training_evidence();

-- 6. Auto-wire trigger: register selections ------------------------------
CREATE OR REPLACE FUNCTION public.trg_promote_register_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prereq_id uuid;
  r RECORD;
BEGIN
  IF NEW.status = 'complete'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND (NEW.name ILIKE '%LOLC%' OR NEW.register_type ILIKE '%lolc%') THEN
    v_prereq_id := public.find_oi_prereq(NEW.handover_point_id, 'LOLC');
    IF v_prereq_id IS NOT NULL THEN
      FOR r IN
        SELECT id FROM public.p2a_vcr_register_attachments
        WHERE register_id = NEW.id
          AND attachment_kind = 'completed'
          AND promoted_evidence_id IS NULL
      LOOP
        PERFORM public.promote_attachment_to_evidence(
          'register', r.id, v_prereq_id, 'lolc_register'::public.p2a_evidence_kind
        );
      END LOOP;
    END IF;
  END IF;

  IF OLD.status = 'complete'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.p2a_vcr_evidence e
       SET confirmed = false
      FROM public.p2a_vcr_register_attachments a
     WHERE a.register_id = NEW.id
       AND a.promoted_evidence_id = e.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_register_evidence ON public.p2a_vcr_register_selections;
CREATE TRIGGER promote_register_evidence
  AFTER UPDATE OF status ON public.p2a_vcr_register_selections
  FOR EACH ROW EXECUTE FUNCTION public.trg_promote_register_evidence();

-- 7. Grants --------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.find_oi_prereq(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_attachment_to_evidence(text, uuid, uuid, public.p2a_evidence_kind) TO authenticated, service_role;

-- 8. Backfill: existing APPROVED procedures, COMPLETED trainings, complete LOLC registers
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Procedures already APPROVED
  FOR rec IN
    SELECT p.id AS proc_id, p.handover_point_id, a.id AS att_id
    FROM public.p2a_vcr_procedures p
    JOIN public.p2a_vcr_procedure_attachments a ON a.procedure_id = p.id
    WHERE p.status = 'APPROVED'::procedure_status
      AND a.kind IN ('draft','markup')
      AND a.promoted_evidence_id IS NULL
  LOOP
    PERFORM public.promote_attachment_to_evidence(
      'procedure', rec.att_id,
      public.find_oi_prereq(rec.handover_point_id, 'Procedures'),
      'signed_procedure'::public.p2a_evidence_kind
    );
  END LOOP;

  -- Trainings already COMPLETED
  FOR rec IN
    SELECT t.id AS tr_id, t.handover_point_id, a.id AS att_id, a.kind
    FROM public.p2a_vcr_training t
    JOIN public.p2a_vcr_training_attachments a ON a.training_id = t.id
    WHERE t.status = 'COMPLETED'::training_status
      AND a.kind IN ('attendance','evidence')
      AND a.promoted_evidence_id IS NULL
  LOOP
    PERFORM public.promote_attachment_to_evidence(
      'training', rec.att_id,
      public.find_oi_prereq(rec.handover_point_id, 'Training'),
      CASE WHEN rec.kind = 'attendance'
           THEN 'attendance_list'::public.p2a_evidence_kind
           ELSE 'other'::public.p2a_evidence_kind END
    );
  END LOOP;

  -- LOLC registers already 'complete'
  FOR rec IN
    SELECT rs.id AS reg_id, rs.handover_point_id, a.id AS att_id
    FROM public.p2a_vcr_register_selections rs
    JOIN public.p2a_vcr_register_attachments a ON a.register_id = rs.id
    WHERE rs.status = 'complete'
      AND (rs.name ILIKE '%LOLC%' OR rs.register_type ILIKE '%lolc%')
      AND a.attachment_kind = 'completed'
      AND a.promoted_evidence_id IS NULL
  LOOP
    PERFORM public.promote_attachment_to_evidence(
      'register', rec.att_id,
      public.find_oi_prereq(rec.handover_point_id, 'LOLC'),
      'lolc_register'::public.p2a_evidence_kind
    );
  END LOOP;
END $$;
