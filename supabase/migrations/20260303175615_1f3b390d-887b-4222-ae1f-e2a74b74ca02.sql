
-- 1. Update generate_pssr_bundles_on_approval to also create approval bundles
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

  -- Create DELIVERING bundles for all assigned delivering parties
  FOR v_response IN
    SELECT r.id, r.checklist_item_id, r.delivering_user_id, r.status, r.response
    FROM public.pssr_checklist_responses r
    WHERE r.pssr_id = NEW.id
      AND r.delivering_user_id IS NOT NULL
  LOOP
    v_is_completed := (v_response.status = 'approved' OR v_response.response = 'YES' OR v_response.response = 'NA');

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

    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = v_response.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
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

  -- Create APPROVAL bundles for all assigned approving parties (in 'waiting' status)
  FOR v_response IN
    SELECT r.id, r.checklist_item_id, r.approving_user_id, r.status, r.response
    FROM public.pssr_checklist_responses r
    WHERE r.pssr_id = NEW.id
      AND r.approving_user_id IS NOT NULL
  LOOP
    v_is_completed := (v_response.status = 'approved' OR v_response.response = 'YES' OR v_response.response = 'NA');

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

    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_approval_bundle'
      AND user_id = v_response.approving_user_id
      AND (metadata->>'pssr_id')::text = NEW.id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
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
        v_response.approving_user_id,
        'PSSR Review: ' || COALESCE(NEW.pssr_id, 'Unknown'),
        'pssr_approval_bundle',
        'waiting',  -- Progressive activation: starts as waiting
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
  WHERE type IN ('pssr_checklist_bundle', 'pssr_approval_bundle')
    AND (metadata->>'pssr_id')::text = NEW.id::text
    AND status != 'completed';

  RETURN NEW;
END;
$function$;

-- 2. Update manage_delivering_party_task to handle progressive activation for approval bundles
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
  v_all_delivery_done boolean;
  v_items_ready integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Get PSSR status
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

  -- === DELIVERING PARTY BUNDLE MANAGEMENT ===
  IF NEW.delivering_user_id IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.delivering_user_id IS DISTINCT FROM NEW.delivering_user_id) THEN

    -- Remove from old user's bundle on reassignment
    IF TG_OP = 'UPDATE' AND OLD.delivering_user_id IS NOT NULL AND OLD.delivering_user_id IS DISTINCT FROM NEW.delivering_user_id THEN
      UPDATE public.user_tasks
      SET sub_items = (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM jsonb_array_elements(sub_items) AS item
        WHERE (item->>'checklist_response_id')::text != NEW.id::text
      ), updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      -- Delete empty bundles
      DELETE FROM public.user_tasks
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
        AND jsonb_array_length(sub_items) = 0;

      -- Recalculate old bundle progress
      UPDATE public.user_tasks
      SET progress_percentage = (
            SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
            FROM jsonb_array_elements(sub_items) AS item
          ), updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = OLD.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';
    END IF;

    -- Add to new user's bundle
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
      UPDATE public.user_tasks
      SET sub_items = CASE
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(sub_items) AS item WHERE (item->>'checklist_response_id')::text = NEW.id::text)
            THEN sub_items
            ELSE sub_items || jsonb_build_array(jsonb_build_object(
              'checklist_response_id', NEW.id, 'checklist_item_id', NEW.checklist_item_id,
              'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'), 'completed', v_is_completed
            ))
          END, updated_at = now()
      WHERE id = v_existing_bundle_id;
    ELSE
      INSERT INTO public.user_tasks (user_id, title, type, status, priority, sub_items, progress_percentage, metadata)
      VALUES (
        NEW.delivering_user_id,
        'PSSR Checklist: ' || COALESCE(v_pssr_code, 'Unknown'),
        'pssr_checklist_bundle', 'pending', 'High',
        jsonb_build_array(jsonb_build_object(
          'checklist_response_id', NEW.id, 'checklist_item_id', NEW.checklist_item_id,
          'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'), 'completed', v_is_completed
        )),
        CASE WHEN v_is_completed THEN 100 ELSE 0 END,
        jsonb_build_object('pssr_id', NEW.pssr_id, 'pssr_code', v_pssr_code, 'project_name', v_project_name)
      );
    END IF;

    -- Recalculate new user bundle progress
    UPDATE public.user_tasks
    SET progress_percentage = (
          SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
          FROM jsonb_array_elements(sub_items) AS item
        ), updated_at = now()
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = NEW.delivering_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed';
  END IF;

  -- === APPROVING PARTY BUNDLE MANAGEMENT ===
  IF NEW.approving_user_id IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.approving_user_id IS DISTINCT FROM NEW.approving_user_id) THEN

    -- Remove from old approver's bundle on reassignment
    IF TG_OP = 'UPDATE' AND OLD.approving_user_id IS NOT NULL AND OLD.approving_user_id IS DISTINCT FROM NEW.approving_user_id THEN
      UPDATE public.user_tasks
      SET sub_items = (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM jsonb_array_elements(sub_items) AS item
        WHERE (item->>'checklist_response_id')::text != NEW.id::text
      ), updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND user_id = OLD.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      DELETE FROM public.user_tasks
      WHERE type = 'pssr_approval_bundle'
        AND user_id = OLD.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
        AND jsonb_array_length(sub_items) = 0;

      UPDATE public.user_tasks
      SET progress_percentage = (
            SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
            FROM jsonb_array_elements(sub_items) AS item
          ), updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND user_id = OLD.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';
    END IF;

    -- Add to new approver's bundle
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_approval_bundle'
      AND user_id = NEW.approving_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed'
    LIMIT 1;

    IF v_existing_bundle_id IS NOT NULL THEN
      UPDATE public.user_tasks
      SET sub_items = CASE
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(sub_items) AS item WHERE (item->>'checklist_response_id')::text = NEW.id::text)
            THEN sub_items
            ELSE sub_items || jsonb_build_array(jsonb_build_object(
              'checklist_response_id', NEW.id, 'checklist_item_id', NEW.checklist_item_id,
              'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'), 'completed', v_is_completed
            ))
          END, updated_at = now()
      WHERE id = v_existing_bundle_id;
    ELSE
      INSERT INTO public.user_tasks (user_id, title, type, status, priority, sub_items, progress_percentage, metadata)
      VALUES (
        NEW.approving_user_id,
        'PSSR Review: ' || COALESCE(v_pssr_code, 'Unknown'),
        'pssr_approval_bundle', 'waiting', 'High',
        jsonb_build_array(jsonb_build_object(
          'checklist_response_id', NEW.id, 'checklist_item_id', NEW.checklist_item_id,
          'summary', COALESCE(v_item_desc, 'PSSR Checklist Item'), 'completed', v_is_completed
        )),
        CASE WHEN v_is_completed THEN 100 ELSE 0 END,
        jsonb_build_object('pssr_id', NEW.pssr_id, 'pssr_code', v_pssr_code, 'project_name', v_project_name)
      );
    END IF;

    UPDATE public.user_tasks
    SET progress_percentage = (
          SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
          FROM jsonb_array_elements(sub_items) AS item
        ), updated_at = now()
    WHERE type = 'pssr_approval_bundle'
      AND user_id = NEW.approving_user_id
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status != 'completed';
  END IF;

  -- === STATUS CHANGE HANDLING (delivering + approval sub_item updates) ===
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.response IS DISTINCT FROM NEW.response) THEN
    -- Update delivering bundle sub_item
    IF NEW.delivering_user_id IS NOT NULL THEN
      UPDATE public.user_tasks
      SET sub_items = (
        SELECT COALESCE(jsonb_agg(
          CASE WHEN (item->>'checklist_response_id')::text = NEW.id::text
          THEN jsonb_set(item, '{completed}', to_jsonb(v_is_completed)) ELSE item END
        ), '[]'::jsonb)
        FROM jsonb_array_elements(sub_items) AS item
      ), updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = NEW.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      UPDATE public.user_tasks
      SET progress_percentage = (
            SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
            FROM jsonb_array_elements(sub_items) AS item
          ), updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = NEW.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      -- Auto-complete delivering bundle if 100%
      UPDATE public.user_tasks
      SET status = 'completed', updated_at = now()
      WHERE type = 'pssr_checklist_bundle'
        AND user_id = NEW.delivering_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
        AND progress_percentage = 100;
    END IF;

    -- Update approval bundle sub_item
    IF NEW.approving_user_id IS NOT NULL THEN
      UPDATE public.user_tasks
      SET sub_items = (
        SELECT COALESCE(jsonb_agg(
          CASE WHEN (item->>'checklist_response_id')::text = NEW.id::text
          THEN jsonb_set(item, '{completed}', to_jsonb(v_is_completed)) ELSE item END
        ), '[]'::jsonb)
        FROM jsonb_array_elements(sub_items) AS item
      ), updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND user_id = NEW.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      UPDATE public.user_tasks
      SET progress_percentage = (
            SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
            FROM jsonb_array_elements(sub_items) AS item
          ), updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND user_id = NEW.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed';

      -- Auto-complete approval bundle if 100%
      UPDATE public.user_tasks
      SET status = 'completed', updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND user_id = NEW.approving_user_id
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
        AND progress_percentage = 100;
    END IF;

    -- === PROGRESSIVE ACTIVATION ===
    -- Check if ALL delivering bundles for this PSSR are done
    SELECT NOT EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE type = 'pssr_checklist_bundle'
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status != 'completed'
    ) INTO v_all_delivery_done;

    IF v_all_delivery_done THEN
      -- Activate waiting approval bundles
      UPDATE public.user_tasks
      SET status = 'pending', updated_at = now()
      WHERE type = 'pssr_approval_bundle'
        AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
        AND status = 'waiting';
    END IF;

    -- Track items_ready_for_review on waiting approval bundles
    SELECT COUNT(*) INTO v_items_ready
    FROM public.pssr_checklist_responses
    WHERE pssr_id = NEW.pssr_id
      AND (status = 'approved' OR response = 'YES' OR response = 'NA');

    UPDATE public.user_tasks
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{items_ready_for_review}', to_jsonb(v_items_ready)),
        updated_at = now()
    WHERE type = 'pssr_approval_bundle'
      AND (metadata->>'pssr_id')::text = NEW.pssr_id::text
      AND status = 'waiting';
  END IF;

  RETURN NEW;
END;
$function$;
