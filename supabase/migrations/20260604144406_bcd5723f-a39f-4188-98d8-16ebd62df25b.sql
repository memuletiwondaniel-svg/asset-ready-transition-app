
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
  v_dms_project_code text;
  v_project_segment text;
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
  SELECT handover_point_id, document_number INTO v_handover_point_id, v_existing
  FROM public.p2a_vcr_procedures
  WHERE id = p_procedure_id;

  IF v_handover_point_id IS NULL THEN
    RAISE EXCEPTION 'Procedure % not found', p_procedure_id;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

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

  -- Resolve project segment from the DMS catalog. The catalog's project_id
  -- column holds the human-readable form (e.g. "DP-300"). Fall back to the
  -- operational identifier when no catalog match exists.
  SELECT dp.code INTO v_dms_project_code
  FROM public.dms_projects dp
  WHERE dp.project_id = (v_project_prefix || '-' || v_project_number)
  LIMIT 1;

  IF v_dms_project_code IS NULL OR v_dms_project_code = '' THEN
    v_project_segment := concat(COALESCE(v_project_prefix, ''), COALESCE(v_project_number, ''));
    RAISE NOTICE 'No dms_projects.code match for %-% — falling back to operational id %',
      v_project_prefix, v_project_number, v_project_segment;
  ELSE
    v_project_segment := v_dms_project_code;
  END IF;

  INSERT INTO public.document_number_sequences AS s (project_id, document_type_code, last_used_seq)
  VALUES (v_project_id, c_doc_type, 1)
  ON CONFLICT (project_id, document_type_code)
  DO UPDATE SET last_used_seq = s.last_used_seq + 1, updated_at = now()
  RETURNING last_used_seq INTO v_seq;

  v_doc_no := lpad(v_seq::text, 5, '0');

  v_full := concat_ws('-',
    v_project_segment,
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
