-- =============================================================================
-- G: Revision / diff-reconcile engine for ORA Plans
-- =============================================================================

-- 1. Backfill source_plan_* on existing leaf tasks so the diff engine can match.
UPDATE public.user_tasks
   SET source_plan_table   = 'orp_plans',
       source_plan_id      = NULLIF(metadata->>'plan_id','')::uuid,
       source_business_key = metadata->>'activity_code',
       source_plan_version = COALESCE(source_plan_version, 1)
 WHERE metadata->>'action' = 'complete_ora_activity'
   AND (source_plan_id IS NULL OR source_business_key IS NULL);

-- 2. Diff-reconcile function — KEEP unchanged/renamed (match by activity_code),
--    CREATE new keys, SUPERSEDE (cancelled_superseded) removed keys.
CREATE OR REPLACE FUNCTION public.reconcile_ora_plan_tasks(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan        RECORD;
  v_new_version INT;
  v_proj_id     UUID;
  v_proj_code   TEXT;
  v_proj_name   TEXT;
  v_sr_user_id  UUID;
  v_activity    RECORD;
  v_kept        INT := 0;
  v_renamed     INT := 0;
  v_added       INT := 0;
  v_superseded  INT := 0;
  v_dedupe      TEXT;
  v_existing    RECORD;
  v_new_title   TEXT;
BEGIN
  SELECT * INTO v_plan FROM public.orp_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'orp_plan % not found', p_plan_id; END IF;

  v_new_version := COALESCE(v_plan.version, 1);
  v_proj_id := v_plan.project_id;
  v_sr_user_id := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');

  SELECT COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,''),
         COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,'')
           || ' - ' || COALESCE(pr.project_title,'')
    INTO v_proj_code, v_proj_name
    FROM public.projects pr WHERE pr.id = v_proj_id;

  -- KEEP / RENAME / SUPERSEDE existing tasks
  FOR v_existing IN
    SELECT ut.id, ut.title, ut.source_business_key, ut.status
      FROM public.user_tasks ut
     WHERE ut.source_plan_table = 'orp_plans'
       AND ut.source_plan_id    = p_plan_id
       AND ut.metadata->>'action' = 'complete_ora_activity'
       AND ut.status NOT IN ('cancelled_superseded','cancelled')
  LOOP
    SELECT a.id, a.name, a.activity_code INTO v_activity
      FROM public.ora_plan_activities a
     WHERE a.orp_plan_id = p_plan_id
       AND a.activity_code = v_existing.source_business_key
       AND a.activity_code != 'P2A-01'
       AND lower(a.name) NOT LIKE '%p2a plan%'
       AND lower(a.name) NOT LIKE '%p2a handover%'
       AND a.name IS NOT NULL AND a.name <> ''
       AND NOT EXISTS (
         SELECT 1 FROM public.ora_plan_activities child
          WHERE child.parent_id = a.id AND child.orp_plan_id = p_plan_id
       )
     LIMIT 1;

    IF v_activity.id IS NULL THEN
      -- REMOVED -> supersede (NEVER delete; preserve audit)
      UPDATE public.user_tasks
         SET status              = 'cancelled_superseded',
             source_plan_version = v_new_version,
             updated_at          = now()
       WHERE id = v_existing.id;
      v_superseded := v_superseded + 1;
    ELSE
      v_new_title := v_proj_code || ': ' || v_activity.name;
      UPDATE public.user_tasks
         SET title               = v_new_title,
             source_plan_version = v_new_version,
             metadata            = jsonb_set(
                                     jsonb_set(metadata,'{activity_name}', to_jsonb(v_activity.name), true),
                                     '{plan_version}', to_jsonb(v_new_version), true),
             updated_at          = now()
       WHERE id = v_existing.id;
      IF v_existing.title IS DISTINCT FROM v_new_title THEN
        v_renamed := v_renamed + 1;
      ELSE
        v_kept := v_kept + 1;
      END IF;
    END IF;
  END LOOP;

  -- ADD new keys (present in new plan, no existing live or superseded task at this version)
  IF v_sr_user_id IS NOT NULL THEN
    FOR v_activity IN
      SELECT a.id, a.name, a.activity_code, a.start_date, a.end_date
        FROM public.ora_plan_activities a
       WHERE a.orp_plan_id = p_plan_id
         AND a.activity_code != 'P2A-01'
         AND lower(a.name) NOT LIKE '%p2a plan%'
         AND lower(a.name) NOT LIKE '%p2a handover%'
         AND a.name IS NOT NULL AND a.name <> ''
         AND NOT EXISTS (
           SELECT 1 FROM public.ora_plan_activities child
            WHERE child.parent_id = a.id AND child.orp_plan_id = p_plan_id
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.user_tasks ut
            WHERE ut.source_plan_table = 'orp_plans'
              AND ut.source_plan_id    = p_plan_id
              AND ut.source_business_key = a.activity_code
              AND ut.metadata->>'action' = 'complete_ora_activity'
         )
    LOOP
      v_dedupe := 'complete_ora_activity:' || p_plan_id::text || ':' || v_activity.id::text || ':v' || v_new_version::text;
      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority, dedupe_key,
        source_plan_table, source_plan_id, source_business_key, source_plan_version,
        metadata
      ) VALUES (
        v_sr_user_id,
        v_proj_code || ': ' || v_activity.name,
        'Complete the ORA activity "' || v_activity.name || '" for project ' || v_proj_name || '.',
        'ora_activity','pending','Medium',
        v_dedupe,
        'orp_plans', p_plan_id, v_activity.activity_code, v_new_version,
        jsonb_build_object(
          'source','ora_workflow',
          'project_id', v_proj_id,
          'project_code', v_proj_code,
          'plan_id', p_plan_id,
          'action','complete_ora_activity',
          'ora_plan_activity_id', v_activity.id,
          'ora_activity_id', v_activity.id,
          'activity_code', v_activity.activity_code,
          'activity_name', v_activity.name,
          'start_date', v_activity.start_date,
          'end_date', v_activity.end_date,
          'plan_version', v_new_version
        )
      );
      v_added := v_added + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'plan_id', p_plan_id,
    'new_version', v_new_version,
    'kept', v_kept,
    'renamed', v_renamed,
    'added', v_added,
    'superseded', v_superseded
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.reconcile_ora_plan_tasks(uuid) TO authenticated, service_role;

-- 3. ORA-Lead-only re-approval gate
CREATE OR REPLACE FUNCTION public.orp_plan_is_approved(_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _model      text;
  _version    int;
  _max_cycle  int;
  _count      int;
BEGIN
  SELECT gate_model, COALESCE(version,1) INTO _model, _version
    FROM public.orp_plans WHERE id = _plan_id;
  IF _model = 'legacy' THEN RETURN true; END IF;

  IF _version > 1 THEN
    -- Revision: ORA-Lead-only re-approval at the latest cycle.
    SELECT MAX(cycle) INTO _max_cycle FROM public.orp_approvals
     WHERE orp_plan_id = _plan_id AND approver_role = 'ORA Lead';
    IF _max_cycle IS NULL THEN RETURN false; END IF;
    SELECT COUNT(*) INTO _count FROM public.orp_approvals
     WHERE orp_plan_id = _plan_id
       AND approver_role = 'ORA Lead'
       AND cycle = _max_cycle
       AND status = 'APPROVED';
    RETURN _count >= 1;
  END IF;

  -- Initial approval: full PHL + DPD panel (ORA Lead already gates via flow).
  SELECT COUNT(DISTINCT a.approver_role) INTO _count
    FROM public.orp_approvals a
    JOIN public.roles r ON r.name = a.approver_role
   WHERE a.orp_plan_id = _plan_id
     AND a.status = 'APPROVED'
     AND a.approver_role IN ('Project Hub Lead','Dep. Plant Director')
     AND r.is_active = true
     AND r.is_retired = false;
  RETURN _count = 2;
END $$;

-- 4. Gate PHL/DPD seeding off revisions (revision = ORA-Lead-only).
CREATE OR REPLACE FUNCTION public.create_phl_dpd_review_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role      TEXT;
  v_user_id   uuid;
  v_proj_code TEXT;
  v_proj_id   uuid;
  v_dedupe    TEXT;
  v_version   INT;
BEGIN
  IF NEW.approver_role <> 'ORA Lead'
     OR NEW.status <> 'APPROVED'
     OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT p.project_id, COALESCE(p.version,1),
         COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,'')
    INTO v_proj_id, v_version, v_proj_code
    FROM public.orp_plans p
    JOIN public.projects pr ON pr.id = p.project_id
   WHERE p.id = NEW.orp_plan_id;

  -- Revision (version > 1): ORA-Lead-only re-approval — skip PHL/DPD seed.
  IF v_version > 1 THEN RETURN NEW; END IF;

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
          'source','ora_workflow','project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', NEW.orp_plan_id, 'action','review_ora_plan', 'approver_role', v_role
        )
      );
    END IF;

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

-- 5. Route leaf-create to reconcile on revisions; tag source_plan_* on initial create.
CREATE OR REPLACE FUNCTION public.auto_create_ora_leaf_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sr_user_id uuid;
  v_proj_id    uuid;
  v_proj_code  TEXT;
  v_proj_name  TEXT;
  v_activity   RECORD;
  v_index      INT := 0;
  v_dedupe     TEXT;
  v_version    INT;
BEGIN
  IF NEW.status <> 'APPROVED' OR (OLD.status = 'APPROVED') THEN RETURN NEW; END IF;
  IF NOT public.orp_plan_is_approved(NEW.orp_plan_id) THEN RETURN NEW; END IF;

  SELECT p.project_id, COALESCE(p.version,1) INTO v_proj_id, v_version
    FROM public.orp_plans p WHERE p.id = NEW.orp_plan_id;

  -- Revision path: diff-reconcile, do NOT regenerate full leaf set.
  IF v_version > 1 THEN
    PERFORM public.reconcile_ora_plan_tasks(NEW.orp_plan_id);
    RETURN NEW;
  END IF;

  v_sr_user_id := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_sr_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,''),
         COALESCE(pr.project_id_prefix,'') || '-' || COALESCE(pr.project_id_number::text,'')
           || ' - ' || COALESCE(pr.project_title,'')
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
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;

    INSERT INTO public.user_tasks (
      user_id, title, description, type, status, priority, dedupe_key,
      source_plan_table, source_plan_id, source_business_key, source_plan_version,
      metadata
    ) VALUES (
      v_sr_user_id,
      v_proj_code || ': ' || v_activity.name,
      'Complete the ORA activity "' || v_activity.name || '" for project ' || v_proj_name || '.',
      'ora_activity','pending',
      CASE WHEN v_index = 0 THEN 'High' ELSE 'Medium' END,
      v_dedupe,
      'orp_plans', NEW.orp_plan_id, v_activity.activity_code, 1,
      jsonb_build_object(
        'source','ora_workflow','project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', NEW.orp_plan_id,'action','complete_ora_activity',
        'ora_plan_activity_id', v_activity.id,'ora_activity_id', v_activity.id,
        'activity_code', v_activity.activity_code,'activity_name', v_activity.name,
        'start_date', v_activity.start_date,'end_date', v_activity.end_date,
        'plan_version', 1
      )
    );
    v_index := v_index + 1;
  END LOOP;

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
        'source','ora_workflow','project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', NEW.orp_plan_id,'action','create_p2a_plan'
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. RPC to initiate a revision cycle: bump version + seed ORA Lead re-approval row.
CREATE OR REPLACE FUNCTION public.revise_orp_plan(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan       RECORD;
  v_new_ver    INT;
  v_user_id    UUID;
  v_proj_code  TEXT;
  v_dedupe     TEXT;
BEGIN
  SELECT * INTO v_plan FROM public.orp_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'orp_plan % not found', p_plan_id; END IF;
  IF v_plan.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'revise_orp_plan: plan % must be APPROVED to revise (currently %)', p_plan_id, v_plan.status;
  END IF;

  v_new_ver := COALESCE(v_plan.version,1) + 1;
  v_user_id := public.resolve_project_role_user(v_plan.project_id, 'ORA Lead');

  UPDATE public.orp_plans
     SET version = v_new_ver,
         status  = 'PENDING_APPROVAL',
         updated_at = now()
   WHERE id = p_plan_id;

  -- Seed ORA Lead re-approval row at new cycle. Mig 6 INSERT CHECK restricts
  -- client inserts; SECURITY DEFINER bypasses; approver_user_id set so the
  -- Mig 6 UPDATE policy lets the ORA Lead approve.
  INSERT INTO public.orp_approvals (orp_plan_id, approver_role, approver_user_id, status, cycle)
  VALUES (p_plan_id, 'ORA Lead', v_user_id, 'PENDING', v_new_ver);

  SELECT COALESCE(project_id_prefix,'') || '-' || COALESCE(project_id_number::text,'')
    INTO v_proj_code FROM public.projects WHERE id = v_plan.project_id;

  v_dedupe := 'review_ora_plan:' || p_plan_id::text || ':ORA Lead:' || v_new_ver::text;
  IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (
      v_user_id,
      v_proj_code || ': Re-approve revised ORA Plan (v' || v_new_ver::text || ')',
      'The ORA Plan has been revised. Review and re-approve.',
      'approval','pending','High',
      v_dedupe,
      jsonb_build_object(
        'source','ora_workflow','project_id', v_plan.project_id,'project_code', v_proj_code,
        'plan_id', p_plan_id,'action','review_ora_plan','approver_role','ORA Lead',
        'revision', true, 'plan_version', v_new_ver
      )
    );
  END IF;

  RETURN jsonb_build_object('plan_id', p_plan_id, 'new_version', v_new_ver, 'ora_lead_user_id', v_user_id);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.revise_orp_plan(uuid) TO authenticated, service_role;