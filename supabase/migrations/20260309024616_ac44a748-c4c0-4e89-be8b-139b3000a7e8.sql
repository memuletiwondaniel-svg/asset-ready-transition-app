-- Clean up duplicate "Develop P2A Plan" ORA activity task that duplicates the "Create P2A Plan" task
DELETE FROM public.user_tasks
WHERE type = 'ora_activity'
  AND metadata->>'action' = 'complete_ora_activity'
  AND (
    lower(metadata->>'activity_name') LIKE '%p2a plan%'
    OR lower(metadata->>'activity_name') LIKE '%p2a handover%'
  );

-- Update the DB trigger to also exclude P2A activities by name pattern (not just code)
CREATE OR REPLACE FUNCTION public.auto_create_ora_leaf_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sr_ora_user_id uuid;
  v_project_id uuid;
  v_proj_code text;
  v_proj_name text;
  v_activity record;
  v_index int := 0;
BEGIN
  IF NEW.status != 'APPROVED' OR (OLD IS NOT NULL AND OLD.status = 'APPROVED') THEN
    RETURN NEW;
  END IF;

  v_project_id := NEW.project_id;

  SELECT ptm.user_id INTO v_sr_ora_user_id
  FROM public.project_team_members ptm
  WHERE ptm.project_id = v_project_id
    AND lower(ptm.role) SIMILAR TO '%(snr ora|senior ora|sr[.]? ora)%'
  LIMIT 1;

  IF v_sr_ora_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(p.project_id_prefix, '') || '-' || COALESCE(p.project_id_number::text, ''),
    COALESCE(p.project_id_prefix, '') || '-' || COALESCE(p.project_id_number::text, '') || ' - ' || COALESCE(p.project_title, '')
  INTO v_proj_code, v_proj_name
  FROM public.projects p
  WHERE p.id = v_project_id;

  FOR v_activity IN
    SELECT a.id, a.name, a.activity_code, a.start_date, a.end_date
    FROM public.ora_plan_activities a
    WHERE a.orp_plan_id = NEW.id
      AND a.activity_code != 'P2A-01'
      AND lower(a.name) NOT LIKE '%p2a plan%'
      AND lower(a.name) NOT LIKE '%p2a handover%'
      AND a.name IS NOT NULL AND a.name != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.ora_plan_activities child
        WHERE child.parent_id = a.id AND child.orp_plan_id = NEW.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_tasks ut
        WHERE ut.type = 'ora_activity'
          AND ut.metadata->>'ora_plan_activity_id' = a.id::text
      )
    ORDER BY a.start_date ASC NULLS LAST
  LOOP
    PERFORM public.create_user_task(
      p_user_id := v_sr_ora_user_id,
      p_title := v_activity.name || ' – ' || v_proj_code,
      p_description := 'Complete the ORA activity "' || v_activity.name || '" for project ' || v_proj_name || '.',
      p_type := 'ora_activity',
      p_status := 'pending',
      p_priority := CASE WHEN v_index = 0 THEN 'High' ELSE 'Medium' END,
      p_metadata := jsonb_build_object(
        'source', 'ora_workflow',
        'project_id', v_project_id,
        'project_code', v_proj_code,
        'plan_id', NEW.id,
        'action', 'complete_ora_activity',
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

  IF NOT EXISTS (
    SELECT 1 FROM public.user_tasks
    WHERE type = 'task'
      AND metadata->>'plan_id' = NEW.id::text
      AND metadata->>'action' = 'create_p2a_plan'
  ) THEN
    PERFORM public.create_user_task(
      p_user_id := v_sr_ora_user_id,
      p_title := 'Create P2A Plan – ' || v_proj_name,
      p_description := 'The ORA Plan has been approved. Create the P2A handover plan for project ' || v_proj_name || '.',
      p_type := 'task',
      p_status := 'pending',
      p_priority := 'High',
      p_metadata := jsonb_build_object(
        'source', 'ora_workflow',
        'project_id', v_project_id,
        'project_code', v_proj_code,
        'plan_id', NEW.id,
        'action', 'create_p2a_plan'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;