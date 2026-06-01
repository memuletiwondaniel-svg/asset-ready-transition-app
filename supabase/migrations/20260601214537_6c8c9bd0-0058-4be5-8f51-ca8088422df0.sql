CREATE OR REPLACE FUNCTION public.create_p2a_entry_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_proj_id uuid; v_proj_code text; v_user_id uuid; v_dedupe text;
BEGIN
  IF NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
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