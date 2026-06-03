
-- Single shared resolver for P2A approver roles.
-- Wraps the EXISTING two resolvers the wizard roster already uses;
-- invents no new lookup. Triggers and roster both go through this.
CREATE OR REPLACE FUNCTION public.resolve_p2a_approver(
  p_project_id uuid,
  p_role_label text
) RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_plant_name text;
  v_user uuid;
BEGIN
  IF p_role_label = 'Dep. Plant Director' THEN
    SELECT pl.name INTO v_plant_name
      FROM public.projects pr
      JOIN public.plant pl ON pl.id = pr.plant_id
     WHERE pr.id = p_project_id;
    IF v_plant_name IS NULL THEN
      RETURN NULL;
    END IF;
    SELECT d.user_id INTO v_user
      FROM public.find_deputy_plant_director(v_plant_name) d
      LIMIT 1;
    RETURN v_user;
  END IF;

  -- 4 standard leads (ORA Lead, Construction Lead, Commissioning Lead,
  -- Project Hub Lead) — unchanged behaviour.
  RETURN public.resolve_project_role_user(p_project_id, p_role_label);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.resolve_p2a_approver(uuid, text) TO authenticated, service_role;

-- Profile-shaped RPC for the client roster, so it can drop its own
-- per-role branching and share one source of truth with the triggers.
CREATE OR REPLACE FUNCTION public.resolve_p2a_approver_profile(
  p_project_id uuid,
  p_role_label text
) RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_user uuid;
BEGIN
  v_user := public.resolve_p2a_approver(p_project_id, p_role_label);
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.full_name, p.avatar_url
      FROM public.profiles p
     WHERE p.user_id = v_user
     LIMIT 1;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.resolve_p2a_approver_profile(uuid, text) TO authenticated, service_role;

-- Repoint trigger: ORA Lead resolution now goes through shared resolver.
CREATE OR REPLACE FUNCTION public.create_p2a_ora_lead_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE v_user_id uuid; v_proj_code text; v_dedupe text;
BEGIN
  IF NEW.status::text IS DISTINCT FROM 'PENDING_APPROVAL'
     OR COALESCE(OLD.status::text,'') = 'PENDING_APPROVAL' THEN RETURN NEW; END IF;
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  v_user_id := public.resolve_p2a_approver(NEW.project_id, 'ORA Lead');
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
END $fn$;

-- Repoint trigger: the 4 fan-out leads (incl. Dep. Plant Director) now go
-- through the shared resolver. This is the core fix — Dep. Plant Director
-- will now resolve to the plant-scoped holder instead of returning NULL.
CREATE OR REPLACE FUNCTION public.create_p2a_lead_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE v_role text; v_user_id uuid; v_proj_id uuid; v_proj_code text;
  v_dedupe text; v_order int;
  v_leads text[] := ARRAY['Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director'];
BEGIN
  IF NEW.role_name <> 'ORA Lead' OR NEW.stage <> 'P2A'
     OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  SELECT p.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.p2a_handover_plans p JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.handover_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;
  v_order := 1;
  FOREACH v_role IN ARRAY v_leads LOOP
    v_user_id := public.resolve_p2a_approver(v_proj_id, v_role);
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
END $fn$;
