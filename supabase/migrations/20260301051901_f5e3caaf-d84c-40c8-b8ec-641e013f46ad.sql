
-- Database trigger to automatically create "Create ORA Plan" task
-- when a Senior ORA Engineer is assigned to a project team.
-- This replaces fragile frontend code and guarantees the task is always created.

CREATE OR REPLACE FUNCTION public.auto_create_ora_plan_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_project_prefix TEXT;
  v_project_number TEXT;
  v_project_title TEXT;
  v_project_name TEXT;
  v_existing_task_count INTEGER;
  v_ora_roles TEXT[] := ARRAY[
    'snr ora engr', 'snr ora engr.', 'snr. ora engr.', 'snr. ora engr',
    'senior ora engr.', 'senior ora engineer'
  ];
BEGIN
  -- Only proceed if the role matches a Senior ORA Engineer variant (case-insensitive)
  IF NOT (LOWER(NEW.role) = ANY(v_ora_roles)) THEN
    RETURN NEW;
  END IF;

  -- Check if a task already exists for this project to prevent duplicates
  SELECT COUNT(*) INTO v_existing_task_count
  FROM public.user_tasks
  WHERE type = 'task'
    AND metadata->>'source' = 'ora_workflow'
    AND metadata->>'project_id' = NEW.project_id::text
    AND metadata->>'action' = 'create_ora_plan';

  IF v_existing_task_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Get project details for the task description
  SELECT project_id_prefix, project_id_number, project_title
  INTO v_project_prefix, v_project_number, v_project_title
  FROM public.projects
  WHERE id = NEW.project_id;

  v_project_name := COALESCE(v_project_prefix, '') || COALESCE(v_project_number, '') || ' - ' || COALESCE(v_project_title, '');

  -- Create the task
  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata)
  VALUES (
    NEW.user_id,
    'Create ORA Plan',
    'Create the ORA Plan for project ' || v_project_name,
    'task',
    'pending',
    'High',
    jsonb_build_object(
      'source', 'ora_workflow',
      'project_id', NEW.project_id,
      'project_name', v_project_name,
      'action', 'create_ora_plan'
    )
  );

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trg_auto_create_ora_plan_task
  AFTER INSERT ON public.project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_ora_plan_task();
