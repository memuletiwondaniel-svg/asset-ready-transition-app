
ALTER TABLE public.vcr_plan_approval_events
  DROP CONSTRAINT IF EXISTS vcr_plan_approval_events_event_type_check;
ALTER TABLE public.vcr_plan_approval_events
  ADD CONSTRAINT vcr_plan_approval_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'SUBMITTED','EDIT','APPROVED','REJECTED','BASELINED','SCOPE_VOIDED',
    'ITEM_ADDED','ITEM_REMOVED'
  ]));

CREATE OR REPLACE FUNCTION public.log_vcr_plan_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_type text := TG_ARGV[0];
  v_name_col  text := TG_ARGV[1];
  v_name_col2 text := CASE WHEN TG_NARGS >= 3 THEN TG_ARGV[2] ELSE NULL END;
  v_hp uuid;
  v_id uuid;
  v_name text;
  v_row jsonb;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    v_action := 'added';
  ELSE
    v_row := to_jsonb(OLD);
    v_action := 'removed';
  END IF;

  v_hp := NULLIF(v_row->>'handover_point_id','')::uuid;
  IF v_hp IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_id := NULLIF(v_row->>'id','')::uuid;
  v_name := NULLIF(v_row->>v_name_col, '');
  IF v_name IS NULL AND v_name_col2 IS NOT NULL THEN
    v_name := NULLIF(v_row->>v_name_col2, '');
  END IF;

  INSERT INTO public.vcr_plan_approval_events
    (handover_point_id, actor_id, event_type, payload)
  VALUES (
    v_hp,
    auth.uid(),
    CASE WHEN v_action = 'added' THEN 'ITEM_ADDED' ELSE 'ITEM_REMOVED' END,
    jsonb_build_object(
      'action', v_action,
      'item_type', v_item_type,
      'name', v_name,
      'item_id', v_id
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  spec text;
  parts text[];
  tbl text; itype text; col1 text; col2 text;
  args text;
  specs text[] := ARRAY[
    'p2a_vcr_training|training|title|',
    'p2a_vcr_procedures|procedure|title|',
    'p2a_vcr_critical_docs|critical_doc|title|doc_code',
    'p2a_vcr_cmms|cmms|title|',
    'p2a_vcr_spares|spare|title|part_number',
    'p2a_vcr_maintenance_deliverables|maintenance|deliverable_type|',
    'p2a_vcr_logsheets|logsheet|title|',
    'p2a_vcr_operational_registers|register|title|',
    'p2a_vcr_register_selections|register|name|',
    'p2a_vcr_documentation|documentation|title|',
    'p2a_vcr_prerequisites|prerequisite|description|'
  ];
BEGIN
  FOREACH spec IN ARRAY specs LOOP
    parts := string_to_array(spec, '|');
    tbl := parts[1]; itype := parts[2]; col1 := parts[3]; col2 := parts[4];
    IF col2 IS NULL OR col2 = '' THEN
      args := format('%L, %L', itype, col1);
    ELSE
      args := format('%L, %L, %L', itype, col1, col2);
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_vcr_item_ins ON public.%I', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_vcr_item_del ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_log_vcr_item_ins AFTER INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_vcr_plan_item_event(%s)',
      tbl, args
    );
    EXECUTE format(
      'CREATE TRIGGER trg_log_vcr_item_del AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_vcr_plan_item_event(%s)',
      tbl, args
    );
  END LOOP;
END $$;
