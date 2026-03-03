
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
  v_pssr_status text;
  v_is_completed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Get PSSR status — only create/manage bundles after lead approval (UNDER_REVIEW or later)
  SELECT p.status, p.pssr_id, p.project_name
  INTO v_pssr_status, v_pssr_code, v_project_name
  FROM public.pssrs p
  WHERE p.id = NEW.pssr_id;

  -- Block bundle creation for draft/pending statuses
  IF v_pssr_status IN ('DRAFT', 'PENDING_LEAD_REVIEW') THEN
    RETURN NEW;
  END IF;

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

      -- Recalculate old bundle progress, delete if empty
      DELETE FROM public.user_tasks
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
        AND jsonb_array_length(sub_items) = 0;

      UPDATE public.user_tasks
      SET progress_percentage = (
            SELECT ROUND(
              COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
              / GREATEST(COUNT(*), 1) * 100
            )
            FROM jsonb_array_elements(sub_items) AS item
          ),
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

    -- Recalculate progress on new user's bundle
    UPDATE public.user_tasks
    SET progress_percentage = (
          SELECT ROUND(
            COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
            / GREATEST(COUNT(*), 1) * 100
          )
          FROM jsonb_array_elements(sub_items) AS item
        ),
        updated_at = now()
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed';
  END IF;

  -- Handle status changes (approval/completion) — update sub_item in bundle
  IF TG_OP = 'UPDATE' AND NEW.delivering_user_id IS NOT NULL 
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.response IS DISTINCT FROM NEW.response) THEN
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

    -- Recalculate progress
    UPDATE public.user_tasks
    SET progress_percentage = (
          SELECT ROUND(
            COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
            / GREATEST(COUNT(*), 1) * 100
          )
          FROM jsonb_array_elements(sub_items) AS item
        ),
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

-- Also need a trigger on pssrs status change to generate bundles
-- when PSSR transitions to UNDER_REVIEW
CREATE OR REPLACE FUNCTION public.generate_pssr_bundles_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_response RECORD;
  v_item_desc text;
  v_existing_bundle_id uuid;
  v_is_completed boolean;
BEGIN
  -- Only fire when status transitions TO UNDER_REVIEW
  IF NEW.status != 'UNDER_REVIEW' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'UNDER_REVIEW' THEN RETURN NEW; END IF;

  -- Create bundles for all assigned delivering parties
  FOR v_response IN
    SELECT r.id, r.checklist_item_id, r.delivering_user_id, r.status, r.response
    FROM public.pssr_checklist_responses r
    WHERE r.pssr_id = NEW.id
      AND r.delivering_user_id IS NOT NULL
  LOOP
    v_is_completed := (v_response.status = 'approved' OR v_response.response = 'YES' OR v_response.response = 'NA');

    -- Get item description
    SELECT description INTO v_item_desc
    FROM public.pssr_checklist_items
    WHERE id = v_response.checklist_item_id;

    IF v_item_desc IS NULL THEN
      BEGIN
        SELECT description INTO v_item_desc
        FROM public.pssr_custom_checklist_items
        WHERE id = REPLACE(v_response.checklist_item_id, 'custom-', '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_item_desc := 'PSSR Checklist Item';
      END;
    END IF;

    -- Check if bundle already exists
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = v_response.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
      -- Add if not already present
      UPDATE public.user_tasks
      SET sub_items = CASE
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements(sub_items) AS item
              WHERE (item->>'checklist_response_id')::text = v_response.id::text
            ) THEN sub_items
            ELSE sub_items || jsonb_build_array(jsonb_build_object(
              'checklist_response_id', v_response.id,
              'checklist_item_id', v_response.checklist_item_id,
              'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
              'completed', v_is_completed
            ))
          END,
          updated_at = now()
      WHERE id = v_existing_bundle_id;
    ELSE
      INSERT INTO public.user_tasks (user_id, title, type, status, priority, sub_items, progress_percentage, metadata)
      VALUES (
        v_response.delivering_user_id,
        'PSSR Checklist: ' || COALESCE(NEW.pssr_id, 'Unknown'),
        'pssr_checklist_bundle',
        'pending',
        'High',
        jsonb_build_array(jsonb_build_object(
          'checklist_response_id', v_response.id,
          'checklist_item_id', v_response.checklist_item_id,
          'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'),
          'completed', v_is_completed
        )),
        CASE WHEN v_is_completed THEN 100 ELSE 0 END,
        jsonb_build_object(
          'pssr_id', NEW.id,
          'pssr_code', NEW.pssr_id,
          'project_name', NEW.project_name
        )
      );
    END IF;
  END LOOP;

  -- Recalculate progress on all bundles for this PSSR
  UPDATE public.user_tasks
  SET progress_percentage = (
        SELECT ROUND(
          COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric 
          / GREATEST(COUNT(*), 1) * 100
        )
        FROM jsonb_array_elements(sub_items) AS item
      ),
      updated_at = now()
  WHERE type = 'pssr_checklist_bundle'
    AND (metadata->>'pssr_id')::text = NEW.id::text
    AND status != 'completed';

  RETURN NEW;
END;
$function$;

-- Create the trigger on pssrs table for bundle generation
DROP TRIGGER IF EXISTS trg_generate_pssr_bundles_on_approval ON public.pssrs;
CREATE TRIGGER trg_generate_pssr_bundles_on_approval
  AFTER UPDATE ON public.pssrs
  FOR EACH ROW
  WHEN (NEW.status = 'UNDER_REVIEW' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.generate_pssr_bundles_on_approval();
