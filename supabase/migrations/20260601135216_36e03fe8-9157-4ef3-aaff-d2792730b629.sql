-- Mig 10c — Wire ORA task-generation triggers to catalog (10a) + gate (10b).
--
-- Replaces:
--   * auto_create_ora_plan_task     — hand-list role match + hardcoded title
--   * auto_create_ora_leaf_tasks    — fires on orp_plans.status flip alone
-- Adds:
--   * trg_create_ora_lead_review    — R2 (submit → ORA Lead task + seed)
--   * trg_create_phl_dpd_reviews    — R3/R4 (ORA Lead approve → PHL+DPD)
--
-- All four resolve assignees via resolve_project_role_user (10a). Leaf-task
-- creation reads orp_plan_is_approved() (the gate fn) — the per-approver
-- architecture is now load-bearing, not ornamental. Mig 6 INSERT CHECK is
-- bypassed by SECURITY DEFINER for the PENDING seed rows; the seeded
-- approver_user_id matches what Mig 6's UPDATE policy requires.
--
-- dedupe_key shape: '<action>:<plan_id>:<role>:<cycle>' so the same approval
-- event re-firing produces no duplicate tasks (cross-cutting F).

-- ─── R1: auto_create_ora_plan_task (rewrite) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_create_ora_plan_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_prefix TEXT;
  v_proj_number TEXT;
  v_proj_title  TEXT;
  v_proj_code   TEXT;
  v_proj_name   TEXT;
  v_dedupe      TEXT;
BEGIN
  -- Catalog match only — no string lists. If the canonical Sr ORA Engr label
  -- changes in the roles catalog, the slug rule (slugifyRoleCode) keeps
  -- callers aligned; the trigger here checks the canonical name directly.
  IF NEW.role IS DISTINCT FROM 'Sr ORA Engr' THEN
    RETURN NEW;
  END IF;

  v_dedupe := 'create_ora_plan:' || NEW.project_id::text || ':Sr ORA Engr:1';

  IF EXISTS (
    SELECT 1 FROM public.user_tasks
    WHERE dedupe_key = v_dedupe
  ) THEN
    RETURN NEW;
  END IF;

  SELECT project_id_prefix, project_id_number::text, project_title
    INTO v_proj_prefix, v_proj_number, v_proj_title
  FROM public.projects WHERE id = NEW.project_id;

  v_proj_code := COALESCE(v_proj_prefix,'') || '-' || COALESCE(v_proj_number,'');
  v_proj_name := v_proj_code || ' - ' || COALESCE(v_proj_title,'');

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
  VALUES (
    NEW.user_id,
    v_proj_code || ': Develop ORA Plan',
    'Develop the ORA Plan for project ' || v_proj_name,
    'task', 'pending', 'High',
    v_dedupe,
    jsonb_build_object(
      'source','ora_workflow',
      'project_id', NEW.project_id,
      'project_code', v_proj_code,
      'project_name', v_proj_name,
      'action','create_ora_plan'
    )
  );
  RETURN NEW;
END;
$function$;

-- ─── R2: ORA Lead review task on submit + seed PENDING row ───────────────
CREATE OR REPLACE FUNCTION public.create_ora_lead_review_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid;
  v_proj_code TEXT;
  v_dedupe    TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'PENDING_APPROVAL' OR OLD.status = 'PENDING_APPROVAL' THEN
    RETURN NEW;
  END IF;

  v_user_id := public.resolve_project_role_user(NEW.project_id, 'ORA Lead');
  IF v_user_id IS NULL THEN
    -- No catalog-matching ORA Lead on the project team — no assignee, no task.
    -- Surfaces as zero-row in M11 R2; meaningful, not silent.
    RETURN NEW;
  END IF;

  SELECT COALESCE(project_id_prefix,'') || '-' || COALESCE(project_id_number::text,'')
    INTO v_proj_code FROM public.projects WHERE id = NEW.project_id;

  v_dedupe := 'review_ora_plan:' || NEW.id::text || ':ORA Lead:1';

  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (
      v_user_id,
      v_proj_code || ': Review and Approve ORA Plan',
      'Review and approve the ORA Plan for project ' || v_proj_code,
      'approval','pending','High',
      v_dedupe,
      jsonb_build_object(
        'source','ora_workflow',
        'project_id', NEW.project_id,
        'project_code', v_proj_code,
        'plan_id', NEW.id,
        'action','review_ora_plan',
        'approver_role','ORA Lead'
      )
    );
  END IF;

  -- Seed PENDING ORA Lead orp_approvals row. SD bypasses Mig 6 INSERT CHECK
  -- (which restricts client inserts to PHL/DPD with approver_user_id NULL);
  -- approver_user_id is set to the resolved user so Mig 6 UPDATE policy
  -- (auth.uid()=approver_user_id AND current_user_has_role) lets the ORA
  -- Lead approve their own seeded row.
  IF NOT EXISTS (
    SELECT 1 FROM public.orp_approvals
    WHERE orp_plan_id = NEW.id AND approver_role = 'ORA Lead' AND cycle = 1
  ) THEN
    INSERT INTO public.orp_approvals (orp_plan_id, approver_role, approver_user_id, status, cycle)
    VALUES (NEW.id, 'ORA Lead', v_user_id, 'PENDING', 1);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_ora_lead_review ON public.orp_plans;
CREATE TRIGGER trg_create_ora_lead_review
  AFTER UPDATE OF status ON public.orp_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ora_lead_review_task();

-- ─── R3/R4: PHL + DPD review tasks on ORA Lead approval ──────────────────
CREATE OR REPLACE FUNCTION public.create_phl_dpd_review_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role      TEXT;
  v_user_id   uuid;
  v_proj_code TEXT;
  v_proj_id   uuid;
  v_dedupe    TEXT;
BEGIN
  IF NEW.approver_role <> 'ORA Lead'
     OR NEW.status <> 'APPROVED'
     OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT p.project_id, COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_proj_code
  FROM public.orp_plans p
  JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.orp_plan_id;

  FOREACH v_role IN ARRAY ARRAY['Project Hub Lead','Dep. Plant Director'] LOOP
    v_user_id := public.resolve_project_role_user(v_proj_id, v_role);
    IF v_user_id IS NULL THEN CONTINUE; END IF;

    v_dedupe := 'review_ora_plan:' || NEW.orp_plan_id::text || ':' || v_role || ':1';

    IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
      VALUES (
        v_user_id,
        v_proj_code || ': Review and Approve ORA Plan',
        'Review and approve the ORA Plan for project ' || v_proj_code,
        'approval','pending','High',
        v_dedupe,
        jsonb_build_object(
          'source','ora_workflow',
          'project_id', v_proj_id,
          'project_code', v_proj_code,
          'plan_id', NEW.orp_plan_id,
          'action','review_ora_plan',
          'approver_role', v_role
        )
      );
    END IF;

    -- Seed PENDING row for this approver. Same SD-bypass + UPDATE-policy
    -- compatibility as the ORA Lead seed in create_ora_lead_review_task.
    IF NOT EXISTS (
      SELECT 1 FROM public.orp_approvals
      WHERE orp_plan_id = NEW.orp_plan_id AND approver_role = v_role AND cycle = 1
    ) THEN
      INSERT INTO public.orp_approvals (orp_plan_id, approver_role, approver_user_id, status, cycle)
      VALUES (NEW.orp_plan_id, v_role, v_user_id, 'PENDING', 1);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_phl_dpd_reviews ON public.orp_approvals;
CREATE TRIGGER trg_create_phl_dpd_reviews
  AFTER UPDATE OF status ON public.orp_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_phl_dpd_review_tasks();

-- ─── R5: leaf-activity tasks (rewrite) ───────────────────────────────────
-- New gate condition: per-approver join via orp_plan_is_approved(), not a
-- single orp_plans.status flip. Trigger moves from orp_plans → orp_approvals
-- so it fires on the event that actually changes the gate's answer.
CREATE OR REPLACE FUNCTION public.auto_create_ora_leaf_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sr_user_id uuid;
  v_proj_id    uuid;
  v_proj_code  TEXT;
  v_proj_name  TEXT;
  v_activity   RECORD;
  v_index      INT := 0;
  v_dedupe     TEXT;
BEGIN
  -- Gate: fire only when this approval flip CAUSES the gate to become true.
  IF NEW.status <> 'APPROVED' OR (OLD.status = 'APPROVED') THEN
    RETURN NEW;
  END IF;
  IF NOT public.orp_plan_is_approved(NEW.orp_plan_id) THEN
    RETURN NEW;
  END IF;

  SELECT p.project_id INTO v_proj_id FROM public.orp_plans p WHERE p.id = NEW.orp_plan_id;
  v_sr_user_id := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_sr_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,''),
         COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,'') || ' - ' || COALESCE(pr.project_title,'')
    INTO v_proj_code, v_proj_name
  FROM public.projects pr WHERE pr.id = v_proj_id;

  FOR v_activity IN
    SELECT a.id, a.name, a.activity_code, a.start_date, a.end_date
    FROM public.ora_plan_activities a
    WHERE a.orp_plan_id = NEW.orp_plan_id
      AND a.activity_code != 'P2A-01'
      AND lower(a.name) NOT LIKE '%p2a plan%'
      AND lower(a.name) NOT LIKE '%p2a handover%'
      AND a.name IS NOT NULL AND a.name != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.ora_plan_activities child
        WHERE child.parent_id = a.id AND child.orp_plan_id = NEW.orp_plan_id
      )
    ORDER BY a.start_date ASC NULLS LAST
  LOOP
    v_dedupe := 'complete_ora_activity:' || NEW.orp_plan_id::text || ':' || v_activity.id::text || ':1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (
      v_sr_user_id,
      v_proj_code || ': ' || v_activity.name,
      'Complete the ORA activity "' || v_activity.name || '" for project ' || v_proj_name || '.',
      'ora_activity','pending',
      CASE WHEN v_index = 0 THEN 'High' ELSE 'Medium' END,
      v_dedupe,
      jsonb_build_object(
        'source','ora_workflow',
        'project_id', v_proj_id,
        'project_code', v_proj_code,
        'plan_id', NEW.orp_plan_id,
        'action','complete_ora_activity',
        'ora_plan_activity_id', v_activity.id,
        'ora_activity_id', v_activity.id,
        'activity_code', v_activity.activity_code,
        'activity_name', v_activity.name,
        'start_date', v_activity.start_date,
        'end_date', v_activity.end_date
      )
    );
    v_index := v_index + 1;
  END LOOP;

  -- P2A follow-on task (R6 precursor). Spec title format applied here too.
  v_dedupe := 'create_p2a_plan:' || NEW.orp_plan_id::text || ':Sr ORA Engr:1';
  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (
      v_sr_user_id,
      v_proj_code || ': Develop P2A Plan',
      'The ORA Plan has been approved. Develop the P2A handover plan for project ' || v_proj_name || '.',
      'task','pending','High',
      v_dedupe,
      jsonb_build_object(
        'source','ora_workflow',
        'project_id', v_proj_id,
        'project_code', v_proj_code,
        'plan_id', NEW.orp_plan_id,
        'action','create_p2a_plan'
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Move the trigger from orp_plans → orp_approvals.
DROP TRIGGER IF EXISTS trg_auto_create_ora_leaf_tasks ON public.orp_plans;
DROP TRIGGER IF EXISTS trg_auto_create_ora_leaf_tasks ON public.orp_approvals;
CREATE TRIGGER trg_auto_create_ora_leaf_tasks
  AFTER UPDATE OF status ON public.orp_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_ora_leaf_tasks();