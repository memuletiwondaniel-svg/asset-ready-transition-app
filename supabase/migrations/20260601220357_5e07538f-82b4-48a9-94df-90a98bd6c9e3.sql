
-- ============================================================================
-- Chunk 2: VCR workflow (R13–R18) — spec_v2 chain on p2a_handover_points
-- ============================================================================

-- ── R13: VCR submit → ORA Lead review + seed ─────────────────────────────
CREATE OR REPLACE FUNCTION public.create_vcr_ora_lead_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_proj_id uuid; v_proj_code text; v_user_id uuid; v_dedupe text;
BEGIN
  IF NEW.execution_plan_status IS DISTINCT FROM 'PENDING_APPROVAL'
     OR COALESCE(OLD.execution_plan_status,'') = 'PENDING_APPROVAL' THEN RETURN NEW; END IF;
  IF NEW.handover_plan_id IS NULL THEN RETURN NEW; END IF;

  SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.p2a_handover_plans pl JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pl.id = NEW.handover_plan_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_user_id := public.resolve_project_role_user(v_proj_id, 'ORA Lead');
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  v_dedupe := 'review_vcr_plan:'||NEW.id::text||':ORA Lead:1';
  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (v_user_id, v_proj_code||': Review and Approve '||NEW.vcr_code||' Plan',
      'Review and approve the '||NEW.vcr_code||' execution plan',
      'approval','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', NEW.handover_plan_id,'point_id', NEW.id,
        'vcr_code', NEW.vcr_code,'action','review_vcr_plan','approver_role','ORA Lead'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_approvers
    WHERE handover_id = NEW.handover_plan_id AND point_id = NEW.id
      AND stage='VCR' AND role_name='ORA Lead' AND cycle=1) THEN
    INSERT INTO public.p2a_handover_approvers (handover_id, point_id, stage, role_name, user_id, display_order, status, cycle)
    VALUES (NEW.handover_plan_id, NEW.id, 'VCR', 'ORA Lead', v_user_id, 0, 'PENDING', 1);
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_create_vcr_ora_lead_review ON public.p2a_handover_points;
CREATE TRIGGER trg_create_vcr_ora_lead_review
AFTER UPDATE ON public.p2a_handover_points
FOR EACH ROW EXECUTE FUNCTION public.create_vcr_ora_lead_review();


-- ── R14–R17: ORA Lead VCR approval → 4 lead reviews + seeds ──────────────
CREATE OR REPLACE FUNCTION public.create_vcr_lead_reviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_role text; v_user_id uuid; v_proj_id uuid; v_proj_code text;
        v_dedupe text; v_order int; v_vcr_code text;
        v_leads text[] := ARRAY['Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director'];
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.role_name <> 'ORA Lead'
     OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;

  SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''), pt.vcr_code
    INTO v_proj_id, v_proj_code, v_vcr_code
  FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_order := 1;
  FOREACH v_role IN ARRAY v_leads LOOP
    v_user_id := public.resolve_project_role_user(v_proj_id, v_role);
    IF v_user_id IS NOT NULL THEN
      v_dedupe := 'review_vcr_plan:'||NEW.point_id::text||':'||v_role||':1';
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
        INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
        VALUES (v_user_id, v_proj_code||': Review and Approve '||v_vcr_code||' Plan',
          'Review and approve the '||v_vcr_code||' execution plan',
          'approval','pending','High', v_dedupe,
          jsonb_build_object('source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id,'project_code', v_proj_code,
            'plan_id', NEW.handover_id,'point_id', NEW.point_id,
            'vcr_code', v_vcr_code,'action','review_vcr_plan','approver_role', v_role));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_approvers
        WHERE handover_id = NEW.handover_id AND point_id = NEW.point_id
          AND stage='VCR' AND role_name=v_role AND cycle=1) THEN
        INSERT INTO public.p2a_handover_approvers (handover_id, point_id, stage, role_name, user_id, display_order, status, cycle)
        VALUES (NEW.handover_id, NEW.point_id, 'VCR', v_role, v_user_id, v_order, 'PENDING', 1);
      END IF;
    END IF;
    v_order := v_order + 1;
  END LOOP;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_create_vcr_lead_reviews ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_vcr_lead_reviews
AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW EXECUTE FUNCTION public.create_vcr_lead_reviews();


-- ── R18: 4-of-4 VCR approval → 5 deliverable parents (+ 2 sub-tasks each) ─
CREATE OR REPLACE FUNCTION public.create_vcr_deliverable_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_proj_id uuid; v_proj_code text; v_sr uuid; v_vcr text;
        v_d RECORD; v_parent_id uuid; v_dedupe text; v_sub_dedupe text; i int;
        v_deliverables text[][] := ARRAY[
          ARRAY['deliver_training',            'Deliver Training for'],
          ARRAY['deliver_procedures',          'Deliver Procedures for'],
          ARRAY['deliver_critical_docs',       'Deliver Critical Documents for'],
          ARRAY['deliver_procedures_registers','Deliver Procedures & Registers for'],
          ARRAY['complete_witness_hold',       'Complete Witness and Hold Points for']
        ];
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;

  SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''), pt.vcr_code
    INTO v_proj_id, v_proj_code, v_vcr
  FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_sr := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_sr IS NULL THEN RETURN NEW; END IF;

  FOR v_d IN SELECT v_deliverables[gs][1] AS action, v_deliverables[gs][2] AS title_prefix
             FROM generate_series(1, array_length(v_deliverables,1)) AS gs
  LOOP
    v_dedupe := v_d.action||':'||NEW.point_id::text||':Sr ORA Engr:1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;

    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
    VALUES (v_sr, v_proj_code||': '||v_d.title_prefix||' '||v_vcr,
      v_d.title_prefix||' '||v_vcr,
      'task','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', NEW.handover_id,'point_id', NEW.point_id,
        'vcr_code', v_vcr,'action', v_d.action,'has_sub_tasks', true),
      0)
    RETURNING id INTO v_parent_id;

    -- 2 placeholder sub-tasks per parent → rollup engine yields fractional %
    FOR i IN 1..2 LOOP
      v_sub_dedupe := v_d.action||'_sub:'||NEW.point_id::text||':'||i::text||':1';
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
      VALUES (v_sr, v_proj_code||': '||v_d.title_prefix||' '||v_vcr||' — Step '||i::text,
        'Sub-step '||i::text||' for '||v_d.title_prefix||' '||v_vcr,
        'task','pending','Medium', v_sub_dedupe,
        jsonb_build_object('source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id,'project_code', v_proj_code,
          'plan_id', NEW.handover_id,'point_id', NEW.point_id,
          'vcr_code', v_vcr,'action', v_d.action||'_step','step_index', i),
        v_parent_id);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_create_vcr_deliverable_fanout ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_vcr_deliverable_fanout
AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW EXECUTE FUNCTION public.create_vcr_deliverable_fanout();
