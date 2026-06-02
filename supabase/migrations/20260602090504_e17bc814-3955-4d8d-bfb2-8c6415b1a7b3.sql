
-- ──────────────────────────────────────────────────────────────────────────
-- M11 closure: data-derived R18/R20 fan-out cardinality.
--
-- 1) Three new detail tables (p2a_vcr_critical_docs / p2a_vcr_cmms /
--    p2a_vcr_spares) mirror the training/procedures/registers pattern.
--    Cascade-delete from p2a_handover_points so harness teardown by
--    project_id continues to sweep cleanly via plan→points→detail.
--
-- 2) Rewrite create_vcr_deliverable_fanout (R18) and the R20 block of
--    create_vcr_role_fanout: every action's sub-task count is derived from
--    its detail table rather than FOR i IN 1..2. Sub-task titles come from
--    the detail row (zero rows → zero children, which is correct).
--
-- 3) complete_witness_hold filters p2a_itp_activities to
--    inspection_type IN ('WITNESS','HOLD') so it does not collide with
--    R22b (which fans the full ITP set).
-- ──────────────────────────────────────────────────────────────────────────

-- ── 1) Detail tables ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.p2a_vcr_critical_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text,
  description text,
  responsible_person text,
  target_date date,
  status text NOT NULL DEFAULT 'PLANNED',
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_critical_docs TO authenticated;
GRANT ALL ON public.p2a_vcr_critical_docs TO service_role;
ALTER TABLE public.p2a_vcr_critical_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p2a_vcr_critical_docs read auth" ON public.p2a_vcr_critical_docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2a_vcr_critical_docs write auth" ON public.p2a_vcr_critical_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.p2a_vcr_cmms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title text NOT NULL,
  asset_tag text,
  description text,
  responsible_person text,
  target_date date,
  status text NOT NULL DEFAULT 'PLANNED',
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_cmms TO authenticated;
GRANT ALL ON public.p2a_vcr_cmms TO service_role;
ALTER TABLE public.p2a_vcr_cmms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p2a_vcr_cmms read auth" ON public.p2a_vcr_cmms FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2a_vcr_cmms write auth" ON public.p2a_vcr_cmms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.p2a_vcr_spares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title text NOT NULL,
  part_number text,
  quantity integer,
  description text,
  responsible_person text,
  target_date date,
  status text NOT NULL DEFAULT 'PLANNED',
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_spares TO authenticated;
GRANT ALL ON public.p2a_vcr_spares TO service_role;
ALTER TABLE public.p2a_vcr_spares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p2a_vcr_spares read auth" ON public.p2a_vcr_spares FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2a_vcr_spares write auth" ON public.p2a_vcr_spares FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2) R18 fan-out: data-derived per action ───────────────────────────────
CREATE OR REPLACE FUNCTION public.create_vcr_deliverable_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_proj_id uuid; v_proj_code text; v_sr uuid; v_vcr text; v_handover uuid;
  v_d RECORD; v_parent_id uuid; v_dedupe text; v_sub_dedupe text;
  v_child RECORD; v_idx int;
  v_actions jsonb := jsonb_build_array(
    jsonb_build_object('action','deliver_training',             'title_prefix','Deliver Training for',
                       'detail_table','p2a_vcr_training',             'filter_sql',''),
    jsonb_build_object('action','deliver_procedures',           'title_prefix','Deliver Procedures for',
                       'detail_table','p2a_vcr_procedures',           'filter_sql',''),
    jsonb_build_object('action','deliver_critical_docs',        'title_prefix','Deliver Critical Documents for',
                       'detail_table','p2a_vcr_critical_docs',        'filter_sql',''),
    jsonb_build_object('action','deliver_procedures_registers', 'title_prefix','Deliver Procedures & Registers for',
                       'detail_table','p2a_vcr_operational_registers','filter_sql',''),
    jsonb_build_object('action','complete_witness_hold',        'title_prefix','Complete Witness and Hold Points for',
                       'detail_table','p2a_itp_activities',
                       'filter_sql',$flt$ AND inspection_type IN ('WITNESS','HOLD') $flt$)
  );
  v_a jsonb;
  v_title_col text;
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;

  SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''), pt.vcr_code, pl.id
    INTO v_proj_id, v_proj_code, v_vcr, v_handover
  FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_sr := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_sr IS NULL THEN RETURN NEW; END IF;

  FOR v_a IN SELECT jsonb_array_elements(v_actions) LOOP
    v_dedupe := (v_a->>'action')||':'||NEW.point_id::text||':Sr ORA Engr:1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;

    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
    VALUES (v_sr, v_proj_code||': '||(v_a->>'title_prefix')||' '||v_vcr,
      (v_a->>'title_prefix')||' '||v_vcr,
      'task','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', v_handover,'point_id', NEW.point_id,
        'vcr_code', v_vcr,'action', (v_a->>'action'),'has_sub_tasks', true,
        'detail_table', (v_a->>'detail_table')),
      0)
    RETURNING id INTO v_parent_id;

    -- p2a_itp_activities uses activity_name; everything else uses title.
    v_title_col := CASE WHEN (v_a->>'detail_table') = 'p2a_itp_activities'
                        THEN 'activity_name' ELSE 'title' END;

    -- One sub-task per detail row. Zero detail rows → zero children
    -- (rollup parent stays at 0, denominator 0 means "no work to roll up").
    v_idx := 0;
    FOR v_child IN EXECUTE format(
      'SELECT id, %I AS row_title FROM public.%I WHERE handover_point_id = $1 %s ORDER BY display_order, created_at',
      v_title_col, (v_a->>'detail_table'), (v_a->>'filter_sql')
    ) USING NEW.point_id
    LOOP
      v_idx := v_idx + 1;
      v_sub_dedupe := (v_a->>'action')||'_sub:'||NEW.point_id::text||':'||v_child.id::text||':1';
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
      VALUES (v_sr,
        v_proj_code||': '||(v_a->>'title_prefix')||' '||v_vcr||' — '||COALESCE(v_child.row_title, 'Item '||v_idx::text),
        'Sub-task for '||(v_a->>'title_prefix')||' '||v_vcr,
        'task','pending','Medium', v_sub_dedupe,
        jsonb_build_object('source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id,'project_code', v_proj_code,
          'plan_id', v_handover,'point_id', NEW.point_id,
          'vcr_code', v_vcr,'action', (v_a->>'action')||'_item',
          'detail_table', (v_a->>'detail_table'),
          'detail_row_id', v_child.id,
          'item_index', v_idx),
        v_parent_id);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $fn$;

-- ── 3) R20 block (in create_vcr_role_fanout): data-derived from cmms/spares ──
CREATE OR REPLACE FUNCTION public.create_vcr_role_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proj_id uuid; v_proj_code text; v_vcr text; v_handover uuid;
  v_sr uuid; v_constr uuid; v_comm uuid; v_cmms uuid;
  v_dp RECORD; v_itp RECORD; v_parent_id uuid;
  v_dedupe text; v_sub_d text;
  v_cmms_specs jsonb := jsonb_build_array(
    jsonb_build_object('action','deliver_cmms',   'title_prefix','Deliver CMMS for',                'detail_table','p2a_vcr_cmms'),
    jsonb_build_object('action','deliver_spares', 'title_prefix','Deliver 2Y Operating Spares for', 'detail_table','p2a_vcr_spares')
  );
  v_c jsonb; v_child RECORD; v_idx int;
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;

  SELECT pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code, pl.id
    INTO v_proj_id, v_proj_code, v_vcr, v_handover
  FROM public.p2a_handover_points pt
  JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
  JOIN public.projects pr            ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_sr     := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  v_constr := public.resolve_project_role_user(v_proj_id, 'Construction Lead');
  v_comm   := public.resolve_project_role_user(v_proj_id, 'Commissioning Lead');
  v_cmms   := public.resolve_project_role_user(v_proj_id, 'CMMS Lead');

  -- R19/R21/R22a: checklist per delivering party
  FOR v_dp IN
    SELECT id, user_id FROM public.vcr_item_delivering_parties
    WHERE handover_point_id = NEW.point_id
      AND user_id IN (v_sr, v_constr, v_comm)
  LOOP
    v_dedupe := 'complete_checklist:'||NEW.point_id::text||':'||v_dp.id::text||':1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
    VALUES (v_dp.user_id,
      v_proj_code||': Complete '||v_vcr||' Checklist Items',
      'Complete VCR delivering-party checklist items',
      'task','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', v_handover,'point_id', NEW.point_id,'vcr_code', v_vcr,
        'action','complete_checklist','delivering_party_id', v_dp.id),
      0);
  END LOOP;

  -- R20: CMMS + Spares parents → CMMS Lead, children derived from detail tables
  IF v_cmms IS NOT NULL THEN
    FOR v_c IN SELECT jsonb_array_elements(v_cmms_specs) LOOP
      v_dedupe := (v_c->>'action')||':'||NEW.point_id::text||':CMMS Lead:1';
      IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
      VALUES (v_cmms,
        v_proj_code||': '||(v_c->>'title_prefix')||' '||v_vcr,
        (v_c->>'title_prefix')||' '||v_vcr,
        'task','pending','High', v_dedupe,
        jsonb_build_object('source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id,'project_code', v_proj_code,
          'plan_id', v_handover,'point_id', NEW.point_id,'vcr_code', v_vcr,
          'action', (v_c->>'action'),'has_sub_tasks', true,
          'detail_table', (v_c->>'detail_table')),
        0) RETURNING id INTO v_parent_id;

      v_idx := 0;
      FOR v_child IN EXECUTE format(
        'SELECT id, title AS row_title FROM public.%I WHERE handover_point_id = $1 ORDER BY display_order, created_at',
        (v_c->>'detail_table')
      ) USING NEW.point_id
      LOOP
        v_idx := v_idx + 1;
        v_sub_d := (v_c->>'action')||'_sub:'||NEW.point_id::text||':'||v_child.id::text||':1';
        INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
        VALUES (v_cmms,
          v_proj_code||': '||(v_c->>'title_prefix')||' '||v_vcr||' — '||COALESCE(v_child.row_title, 'Item '||v_idx::text),
          'Sub-task for '||(v_c->>'title_prefix')||' '||v_vcr,
          'task','pending','Medium', v_sub_d,
          jsonb_build_object('source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id,'project_code', v_proj_code,
            'plan_id', v_handover,'point_id', NEW.point_id,'vcr_code', v_vcr,
            'action', (v_c->>'action')||'_item',
            'detail_table', (v_c->>'detail_table'),
            'detail_row_id', v_child.id,
            'item_index', v_idx),
          v_parent_id);
      END LOOP;
    END LOOP;
  END IF;

  -- R22b: Commissioning Lead "Complete ITP" parent + one sub-task per ITP activity
  IF v_comm IS NOT NULL THEN
    v_dedupe := 'complete_itp:'||NEW.point_id::text||':Commissioning Lead:1';
    IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
      VALUES (v_comm,
        v_proj_code||': Complete ITP for '||v_vcr,
        'Complete ITP activities for '||v_vcr,
        'task','pending','High', v_dedupe,
        jsonb_build_object('source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id,'project_code', v_proj_code,
          'plan_id', v_handover,'point_id', NEW.point_id,'vcr_code', v_vcr,
          'action','complete_itp','has_sub_tasks', true),
        0) RETURNING id INTO v_parent_id;

      FOR v_itp IN
        SELECT id, activity_name FROM public.p2a_itp_activities
        WHERE handover_point_id = NEW.point_id
        ORDER BY display_order, created_at
      LOOP
        v_sub_d := 'complete_itp_activity:'||NEW.point_id::text||':'||v_itp.id::text||':1';
        INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
        VALUES (v_comm,
          v_proj_code||': ITP — '||v_itp.activity_name,
          'Complete ITP activity '||v_itp.activity_name,
          'task','pending','Medium', v_sub_d,
          jsonb_build_object('source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id,'project_code', v_proj_code,
            'plan_id', v_handover,'point_id', NEW.point_id,'vcr_code', v_vcr,
            'action','complete_itp_activity',
            'itp_activity_id', v_itp.id,
            'requires_sr_ora_confirmation','true'),
          v_parent_id);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END $$;
