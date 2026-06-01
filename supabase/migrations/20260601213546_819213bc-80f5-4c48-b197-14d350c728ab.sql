
ALTER TYPE public.p2a_plan_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

DROP TRIGGER IF EXISTS trg_auto_create_p2a_approval_task ON public.p2a_handover_approvers;
DROP FUNCTION IF EXISTS public.auto_create_p2a_approval_task() CASCADE;
DROP TRIGGER IF EXISTS trg_initialize_p2a_approval_workflow ON public.p2a_handover_plans;
DROP FUNCTION IF EXISTS public.initialize_p2a_approval_workflow() CASCADE;

CREATE OR REPLACE FUNCTION public.create_p2a_entry_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_proj_id uuid; v_proj_code text; v_user_id uuid; v_dedupe text;
BEGIN
  IF NEW.status <> 'APPROVED' OR COALESCE(OLD.status, '') = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.orp_plan_is_approved(NEW.orp_plan_id) THEN RETURN NEW; END IF;
  SELECT p.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.orp_plans p JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.orp_plan_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;
  v_user_id := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  v_dedupe := 'develop_p2a_plan:'||NEW.orp_plan_id::text||':Sr ORA Engr:1';
  IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN RETURN NEW; END IF;
  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
  VALUES (v_user_id, v_proj_code||': Develop P2A Plan',
    'Develop the P2A Plan for project '||v_proj_code,
    'task','pending','High', v_dedupe,
    jsonb_build_object('source','p2a_handover','contract','spec_v2',
      'project_id', v_proj_id,'project_code', v_proj_code,
      'orp_plan_id', NEW.orp_plan_id,'action','develop_p2a_plan'));
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS trg_create_p2a_entry_task ON public.orp_approvals;
CREATE TRIGGER trg_create_p2a_entry_task AFTER UPDATE ON public.orp_approvals
FOR EACH ROW EXECUTE FUNCTION public.create_p2a_entry_task();

CREATE OR REPLACE FUNCTION public.create_p2a_ora_lead_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid; v_proj_code text; v_dedupe text;
BEGIN
  IF NEW.status::text IS DISTINCT FROM 'PENDING_APPROVAL'
     OR COALESCE(OLD.status::text,'') = 'PENDING_APPROVAL' THEN RETURN NEW; END IF;
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  v_user_id := public.resolve_project_role_user(NEW.project_id, 'ORA Lead');
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(project_id_prefix,'')||'-'||COALESCE(project_id_number::text,'')
    INTO v_proj_code FROM public.projects WHERE id = NEW.project_id;
  v_dedupe := 'review_p2a_plan:'||NEW.id::text||':ORA Lead:1';
  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (v_user_id, v_proj_code||': Review and Approve P2A Plan',
      'Review and approve the P2A Plan for project '||v_proj_code,
      'approval','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', NEW.project_id,'project_code', v_proj_code,
        'plan_id', NEW.id,'action','review_p2a_plan','approver_role','ORA Lead'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_approvers
    WHERE handover_id = NEW.id AND stage='P2A' AND role_name='ORA Lead' AND cycle=1) THEN
    INSERT INTO public.p2a_handover_approvers (handover_id, stage, role_name, user_id, display_order, status, cycle)
    VALUES (NEW.id, 'P2A', 'ORA Lead', v_user_id, 0, 'PENDING', 1);
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS trg_create_p2a_ora_lead_review ON public.p2a_handover_plans;
CREATE TRIGGER trg_create_p2a_ora_lead_review AFTER UPDATE ON public.p2a_handover_plans
FOR EACH ROW EXECUTE FUNCTION public.create_p2a_ora_lead_review();

CREATE OR REPLACE FUNCTION public.create_p2a_lead_reviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role text; v_user_id uuid; v_proj_id uuid; v_proj_code text;
  v_dedupe text; v_order int;
  v_leads text[] := ARRAY['Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director'];
BEGIN
  IF NEW.role_name <> 'ORA Lead' OR NEW.stage <> 'P2A'
     OR NEW.status <> 'APPROVED' OR COALESCE(OLD.status,'') = 'APPROVED' THEN RETURN NEW; END IF;
  SELECT p.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.p2a_handover_plans p JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.handover_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;
  v_order := 1;
  FOREACH v_role IN ARRAY v_leads LOOP
    v_user_id := public.resolve_project_role_user(v_proj_id, v_role);
    IF v_user_id IS NOT NULL THEN
      v_dedupe := 'review_p2a_plan:'||NEW.handover_id::text||':'||v_role||':1';
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
        INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
        VALUES (v_user_id, v_proj_code||': Review and Approve P2A Plan',
          'Review and approve the P2A Plan for project '||v_proj_code,
          'approval','pending','High', v_dedupe,
          jsonb_build_object('source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id,'project_code', v_proj_code,
            'plan_id', NEW.handover_id,'action','review_p2a_plan','approver_role', v_role));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.p2a_handover_approvers
        WHERE handover_id = NEW.handover_id AND stage='P2A' AND role_name=v_role AND cycle=1) THEN
        INSERT INTO public.p2a_handover_approvers (handover_id, stage, role_name, user_id, display_order, status, cycle)
        VALUES (NEW.handover_id, 'P2A', v_role, v_user_id, v_order, 'PENDING', 1);
      END IF;
    END IF;
    v_order := v_order + 1;
  END LOOP;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.create_p2a_vcr_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_proj_id uuid; v_proj_code text; v_user_id uuid; v_dedupe text; v_pt RECORD;
BEGIN
  IF NEW.stage <> 'P2A' OR NEW.status <> 'APPROVED'
     OR COALESCE(OLD.status,'') = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.p2a_plan_is_approved(NEW.handover_id) THEN RETURN NEW; END IF;
  SELECT p.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.p2a_handover_plans p JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.handover_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;
  v_user_id := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  FOR v_pt IN SELECT id, vcr_code FROM public.p2a_handover_points WHERE handover_plan_id = NEW.handover_id
  LOOP
    v_dedupe := 'develop_vcr_plan:'||v_pt.id::text||':Sr ORA Engr:1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (v_user_id, v_proj_code||': Develop '||v_pt.vcr_code||' Plan',
      'Develop the '||v_pt.vcr_code||' execution plan for project '||v_proj_code,
      'task','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', NEW.handover_id,'point_id', v_pt.id,
        'vcr_code', v_pt.vcr_code,'action','develop_vcr_plan'));
  END LOOP;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_create_p2a_lead_reviews ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_p2a_lead_reviews AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW EXECUTE FUNCTION public.create_p2a_lead_reviews();

DROP TRIGGER IF EXISTS trg_create_p2a_vcr_fanout ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_p2a_vcr_fanout AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW EXECUTE FUNCTION public.create_p2a_vcr_fanout();
