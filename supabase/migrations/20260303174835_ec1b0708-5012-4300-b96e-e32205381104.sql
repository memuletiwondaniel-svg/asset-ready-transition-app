
-- Step 1: Replace the manage_delivering_party_task() trigger function
-- with a bundle-based approach (one bundle per user per PSSR)
CREATE OR REPLACE FUNCTION public.manage_delivering_party_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item_desc text;
  v_existing_bundle_id uuid;
  v_pssr_code text;
  v_project_name text;
  v_sub_items jsonb;
  v_total integer;
  v_completed integer;
  v_pct integer;
  v_is_completed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Determine if this response is completed
  v_is_completed := (NEW.status = 'approved' OR NEW.response = 'YES' OR NEW.response = 'NA');

  -- Get item description
  SELECT description INTO v_item_desc
  FROM public.pssr_checklist_items
  WHERE id = NEW.checklist_item_id;

  IF v_item_desc IS NULL THEN
    SELECT description INTO v_item_desc
    FROM public.pssr_custom_checklist_items
    WHERE id = REPLACE(NEW.checklist_item_id, 'custom-', '')::uuid;
  END IF;

  -- Handle delivering_user_id assignment or change
  IF NEW.delivering_user_id IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.delivering_user_id IS DISTINCT FROM NEW.delivering_user_id) THEN
    
    -- Get PSSR details for the bundle title
    SELECT p.pssr_id, p.project_name
    INTO v_pssr_code, v_project_name
    FROM public.pssrs p
    WHERE p.id = NEW.pssr_id;

    -- If user changed, remove sub_item from old user's bundle
    IF TG_OP = 'UPDATE' AND OLD.delivering_user_id IS NOT NULL AND OLD.delivering_user_id IS DISTINCT FROM NEW.delivering_user_id THEN
      UPDATE public.user_tasks
      SET sub_items = (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM jsonb_array_elements(sub_items) AS item
        WHERE (item->>'checklist_response_id')::text != NEW.id::text
      ),
      updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      -- Recalculate old bundle progress
      UPDATE public.user_tasks
      SET progress_percentage = CASE
            WHEN jsonb_array_length(sub_items) = 0 THEN 0
            ELSE ROUND(
              (SELECT COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / COUNT(*)
               FROM jsonb_array_elements(sub_items) AS item) * 100
            )
          END,
          status = CASE
            WHEN jsonb_array_length(sub_items) = 0 THEN 'completed'
            ELSE status
          END,
          updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';
    END IF;

    -- Check if bundle exists for new user
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
      -- Add sub_item to existing bundle (if not already there)
      UPDATE public.user_tasks
      SET sub_items = CASE
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements(sub_items) AS item
              WHERE (item->>'checklist_response_id')::text = NEW.id::text
            ) THEN sub_items
            ELSE sub_items || jsonb_build_array(jsonb_build_object(
              'checklist_response_id', NEW.id,
              'checklist_item_id', NEW.checklist_item_id,
              'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
              'completed', v_is_completed
            ))
          END,
          updated_at = now()
      WHERE id = v_existing_bundle_id;
    ELSE
      -- Create new bundle
      INSERT INTO public.user_tasks (user_id, title, type, status, priority, sub_items, progress_percentage, metadata)
      VALUES (
        NEW.delivering_user_id,
        'PSSR Checklist: ' || COALESCE(v_pssr_code, 'Unknown'),
        'pssr_checklist_bundle',
        'pending',
        'High',
        jsonb_build_array(jsonb_build_object(
          'checklist_response_id', NEW.id,
          'checklist_item_id', NEW.checklist_item_id,
          'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
          'completed', v_is_completed
        )),
        CASE WHEN v_is_completed THEN 100 ELSE 0 END,
        jsonb_build_object(
          'pssr_id', NEW.pssr_id,
          'pssr_code', v_pssr_code,
          'project_name', v_project_name
        )
      );
    END IF;
  END IF;

  -- Handle status changes (approval/completion) — update sub_item in bundle
  IF TG_OP = 'UPDATE' AND NEW.delivering_user_id IS NOT NULL THEN
    -- Update the sub_item completed status
    UPDATE public.user_tasks
    SET sub_items = (
      SELECT COALESCE(jsonb_agg(
        CASE 
          WHEN (item->>'checklist_response_id')::text = NEW.id::text
          THEN jsonb_set(item, '{completed}', to_jsonb(v_is_completed))
          ELSE item
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(sub_items) AS item
    ),
    updated_at = now()
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed';

    -- Recalculate progress on the bundle
    UPDATE public.user_tasks
    SET progress_percentage = CASE
          WHEN jsonb_array_length(sub_items) = 0 THEN 0
          ELSE (
            SELECT ROUND(
              COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
              / GREATEST(COUNT(*), 1) * 100
            )
            FROM jsonb_array_elements(sub_items) AS item
          )
        END,
        updated_at = now()
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed';

    -- Auto-complete bundle if 100%
    UPDATE public.user_tasks
    SET status = 'completed', updated_at = now()
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed'
      AND progress_percentage = 100;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 2: Migrate existing individual pssr_checklist_item tasks into bundles
DO $$
DECLARE
  v_task RECORD;
  v_pssr_id uuid;
  v_pssr_code text;
  v_project_name text;
  v_item_desc text;
  v_response_status text;
  v_response_value text;
  v_existing_bundle_id uuid;
  v_is_completed boolean;
BEGIN
  FOR v_task IN
    SELECT t.id, t.user_id, t.status as task_status,
           (t.metadata->>'pssr_id')::uuid as pssr_id,
           (t.metadata->>'checklist_response_id')::uuid as response_id,
           t.metadata->>'checklist_item_id' as item_id
    FROM public.user_tasks t
    WHERE t.type = 'pssr_checklist_item'
  LOOP
    -- Get PSSR details
    SELECT p.pssr_id, p.project_name
    INTO v_pssr_code, v_project_name
    FROM public.pssrs p
    WHERE p.id = v_task.pssr_id;

    -- Get item description
    SELECT description INTO v_item_desc
    FROM public.pssr_checklist_items
    WHERE id = v_task.item_id;

    IF v_item_desc IS NULL THEN
      BEGIN
        SELECT description INTO v_item_desc
        FROM public.pssr_custom_checklist_items
        WHERE id = REPLACE(v_task.item_id, 'custom-', '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_item_desc := 'PSSR Checklist Item';
      END;
    END IF;

    -- Get response status
    SELECT r.status, r.response
    INTO v_response_status, v_response_value
    FROM public.pssr_checklist_responses r
    WHERE r.id = v_task.response_id;

    v_is_completed := (v_response_status = 'approved' OR v_response_value = 'YES' OR v_response_value = 'NA' OR v_task.task_status = 'completed');

    -- Check if bundle already exists for this user+pssr
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = v_task.user_id
      AND (metadata->>'pssr_id')::text = v_task.pssr_id::text
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
      -- Add to existing bundle
      UPDATE public.user_tasks
      SET sub_items = sub_items || jsonb_build_array(jsonb_build_object(
            'checklist_response_id', v_task.response_id,
            'checklist_item_id', v_task.item_id,
            'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
            'completed', v_is_completed
          )),
          updated_at = now()
      WHERE id = v_existing_bundle_id;
    ELSE
      -- Create new bundle
      INSERT INTO public.user_tasks (user_id, title, type, status, priority, sub_items, progress_percentage, metadata)
      VALUES (
        v_task.user_id,
        'PSSR Checklist: ' || COALESCE(v_pssr_code, 'Unknown'),
        'pssr_checklist_bundle',
        'pending',
        'High',
        jsonb_build_array(jsonb_build_object(
          'checklist_response_id', v_task.response_id,
          'checklist_item_id', v_task.item_id,
          'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
          'completed', v_is_completed
        )),
        CASE WHEN v_is_completed THEN 100 ELSE 0 END,
        jsonb_build_object(
          'pssr_id', v_task.pssr_id,
          'pssr_code', v_pssr_code,
          'project_name', v_project_name
        )
      );
    END IF;

    -- Delete the old individual task
    DELETE FROM public.user_tasks WHERE id = v_task.id;
  END LOOP;

  -- Recalculate progress on all new PSSR bundles
  UPDATE public.user_tasks
  SET progress_percentage = (
    SELECT ROUND(
      COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
      / GREATEST(COUNT(*), 1) * 100
    )
    FROM jsonb_array_elements(sub_items) AS item
  ),
  status = CASE
    WHEN (
      SELECT COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
      / GREATEST(COUNT(*), 1) * 100
      FROM jsonb_array_elements(sub_items) AS item
    ) >= 100 THEN 'completed'
    ELSE status
  END,
  updated_at = now()
  WHERE type = 'pssr_checklist_bundle';
END $$;
