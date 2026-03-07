
-- Database trigger to auto-generate leaf-level ORA activity tasks 
-- when an ORA plan transitions to APPROVED status.
-- This is the authoritative backend solution — no frontend workarounds needed.

CREATE OR REPLACE FUNCTION public.auto_create_ora_leaf_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id UUID;
  v_sr_ora_user_id UUID;
  v_proj_prefix TEXT;
  v_proj_number TEXT;
  v_proj_title TEXT;
  v_proj_code TEXT;
  v_proj_name TEXT;
  v_existing_count INTEGER;
  v_activity RECORD;
  v_index INTEGER := 0;
BEGIN
  -- Only fire when status transitions TO 'APPROVED'
  IF NEW.status != 'APPROVED' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'APPROVED' THEN RETURN NEW; END IF;

  v_project_id := NEW.project_id;

  -- Check if tasks already exist for this plan (idempotent)
  SELECT COUNT(*) INTO v_existing_count
  FROM public.user_tasks
  WHERE type = 'ora_activity'
    AND metadata->>'plan_id' = NEW.id::text;

  IF v_existing_count > 0 THEN RETURN NEW; END IF;

  -- Find the Sr. ORA Engineer on this project
  SELECT ptm.user_id INTO v_sr_ora_user_id
  FROM public.project_team_members ptm
  WHERE ptm.project_id = v_project_id
    AND LOWER(ptm.role) IN (
      'snr ora engr', 'snr ora engr.', 'snr. ora engr.', 'snr. ora engr',
      'senior ora engr.', 'senior ora engineer', 'sr ora engr', 'sr. ora engr'
    )
  LIMIT 1;

  IF v_sr_ora_user_id IS NULL THEN RETURN NEW; END IF;

  -- Get project info for task titles
  SELECT project_id_prefix, project_id_number, project_title
  INTO v_proj_prefix, v_proj_number, v_proj_title
  FROM public.projects
  WHERE id = v_project_id;

  v_proj_code := COALESCE(v_proj_prefix, '') || '-' || COALESCE(v_proj_number, '');
  v_proj_name := v_proj_code || ' - ' || COALESCE(v_proj_title, '');

  -- Find leaf activities (activities that are NOT parents of other activities)
  -- and exclude P2A-01 (has its own task)
  FOR v_activity IN
    SELECT a.id, a.name, a.activity_code, a.start_date, a.end_date
    FROM public.ora_plan_activities a
    WHERE a.orp_plan_id = NEW.id
      AND a.activity_code != 'P2A-01'
      AND a.name IS NOT NULL AND a.name != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.ora_plan_activities child
        WHERE child.parent_id = a.id
      )
    ORDER BY a.start_date NULLS LAST, a.activity_code
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

  -- Also create P2A task if not already existing
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

-- Create trigger on orp_plans
DROP TRIGGER IF EXISTS trg_auto_create_ora_leaf_tasks ON public.orp_plans;
CREATE TRIGGER trg_auto_create_ora_leaf_tasks
  AFTER INSERT OR UPDATE OF status ON public.orp_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_ora_leaf_tasks();
