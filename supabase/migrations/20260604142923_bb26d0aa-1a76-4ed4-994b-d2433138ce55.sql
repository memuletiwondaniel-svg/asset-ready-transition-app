
-- 1. Add document numbering defaults to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS default_plant_code text,
  ADD COLUMN IF NOT EXISTS default_site_code text,
  ADD COLUMN IF NOT EXISTS default_unit_code text;

-- 2. Add document number fields to procedures
ALTER TABLE public.p2a_vcr_procedures
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS document_number_assigned_at timestamptz;

-- 3. Per-project, per-document-type sequence counter
CREATE TABLE IF NOT EXISTS public.document_number_sequences (
  project_id uuid NOT NULL,
  document_type_code text NOT NULL,
  last_used_seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, document_type_code)
);

GRANT SELECT ON public.document_number_sequences TO authenticated;
GRANT ALL ON public.document_number_sequences TO service_role;

ALTER TABLE public.document_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read document sequences"
  ON public.document_number_sequences
  FOR SELECT TO authenticated
  USING (true);

-- 4. Atomic allocation + assignment function for procedure document numbers
CREATE OR REPLACE FUNCTION public.assign_procedure_document_number(p_procedure_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handover_point_id uuid;
  v_existing text;
  v_project_id uuid;
  v_project_prefix text;
  v_project_number text;
  v_plant text;
  v_site text;
  v_unit text;
  v_seq integer;
  v_doc_no text;
  v_full text;
  c_originator constant text := 'BGC';
  c_discipline constant text := 'OA';
  c_doc_type constant text := '6039';
BEGIN
  -- Idempotency: return existing number if already assigned
  SELECT handover_point_id, document_number INTO v_handover_point_id, v_existing
  FROM public.p2a_vcr_procedures
  WHERE id = p_procedure_id;

  IF v_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'Procedure % not found', p_procedure_id;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Resolve project via handover_point -> handover_plan
  SELECT pr.id, pr.project_id_prefix, pr.project_id_number,
         COALESCE(NULLIF(pr.default_plant_code, ''), 'TBD'),
         COALESCE(NULLIF(pr.default_site_code, ''), 'TBD'),
         COALESCE(NULLIF(pr.default_unit_code, ''), 'TBD')
  INTO v_project_id, v_project_prefix, v_project_number, v_plant, v_site, v_unit
  FROM public.p2a_handover_points hp
  JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
  JOIN public.projects pr ON pr.id = hpl.project_id
  WHERE hp.id = v_handover_point_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve project for handover_point %', v_handover_point_id;
  END IF;

  -- Atomic allocation of next sequence (per-project, per-document-type)
  INSERT INTO public.document_number_sequences AS s (project_id, document_type_code, last_used_seq)
  VALUES (v_project_id, c_doc_type, 1)
  ON CONFLICT (project_id, document_type_code)
  DO UPDATE SET last_used_seq = s.last_used_seq + 1, updated_at = now()
  RETURNING last_used_seq INTO v_seq;

  v_doc_no := lpad(v_seq::text, 5, '0');

  v_full := concat_ws('-',
    concat(COALESCE(v_project_prefix, ''), COALESCE(v_project_number, '')),
    c_originator,
    v_plant,
    v_site,
    v_unit,
    c_discipline,
    c_doc_type,
    v_doc_no,
    '00001'
  );

  UPDATE public.p2a_vcr_procedures
  SET document_number = v_full,
      document_number_assigned_at = now()
  WHERE id = p_procedure_id;

  RETURN v_full;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_procedure_document_number(uuid) TO authenticated;
