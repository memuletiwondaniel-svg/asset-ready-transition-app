-- Harden auto_create_ora_plan_task: also skip when a legacy row (no dedupe_key)
-- exists for the same (project_id, action='create_ora_plan'). Prevents the
-- current keyed generator from re-emitting a duplicate on top of pre-dedupe rows.
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
  IF NEW.role IS DISTINCT FROM 'Sr ORA Engr' THEN
    RETURN NEW;
  END IF;

  v_dedupe := 'create_ora_plan:' || NEW.project_id::text || ':Sr ORA Engr:1';

  -- Keyed match (current shape)
  IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
    RETURN NEW;
  END IF;

  -- Legacy match (pre-dedupe rows have dedupe_key IS NULL)
  IF EXISTS (
    SELECT 1 FROM public.user_tasks
    WHERE type = 'task'
      AND metadata->>'source'     = 'ora_workflow'
      AND metadata->>'project_id' = NEW.project_id::text
      AND metadata->>'action'     = 'create_ora_plan'
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