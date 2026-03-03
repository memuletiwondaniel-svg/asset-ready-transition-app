
-- Rewrite generate_pssr_bundles_on_approval to resolve roles to users via profiles
CREATE OR REPLACE FUNCTION public.generate_pssr_bundles_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_response RECORD;
  v_item_desc text;
  v_existing_bundle_id uuid;
  v_is_completed boolean;
  v_plant_name text;
  v_resolved_user_id uuid;
  v_role_name text;
  v_approving_roles text[];
  v_role text;
BEGIN
  -- Only fire when status transitions TO UNDER_REVIEW
  IF NEW.status != 'UNDER_REVIEW' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'UNDER_REVIEW' THEN RETURN NEW; END IF;

  -- Get the plant name for role resolution
  v_plant_name := COALESCE(NEW.plant, '');

  -- ============ DELIVERING BUNDLES ============
  FOR v_response IN
    SELECT r.id, r.checklist_item_id, r.delivering_role, r.status, r.response
    FROM public.pssr_checklist_responses r
    WHERE r.pssr_id = NEW.id
      AND r.delivering_role IS NOT NULL
      AND r.delivering_role != ''
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

    -- Resolve delivering_role to a user_id via profiles
    -- Priority: plant-specific match first, then any match, excluding 'Project' positions
    v_resolved_user_id := NULL;
    
    IF v_plant_name != '' THEN
      SELECT p.user_id INTO v_resolved_user_id
      FROM public.profiles p
      WHERE p.is_active = true
        AND p.position ILIKE '%' || v_response.delivering_role || '%'
        AND p.position ILIKE '%' || v_plant_name || '%'
        AND p.position NOT ILIKE '%project%'
      LIMIT 1;
    END IF;

    -- Fallback: any match without plant, prefer 'Asset' positions
    IF v_resolved_user_id IS NULL THEN
      SELECT p.user_id INTO v_resolved_user_id
      FROM public.profiles p
      WHERE p.is_active = true
        AND p.position ILIKE '%' || v_response.delivering_role || '%'
        AND p.position NOT ILIKE '%project%'
      ORDER BY (CASE WHEN p.position ILIKE '%Asset%' THEN 0 ELSE 1 END)
      LIMIT 1;
    END IF;

    IF v_resolved_user_id IS NULL THEN
      CONTINUE; -- Skip if no user found for this role
    END IF;

    -- Also update the delivering_user_id on the response row for future trigger compatibility
    UPDATE public.pssr_checklist_responses
    SET delivering_user_id = v_resolved_user_id
    WHERE id = v_response.id AND delivering_user_id IS NULL;

    -- Find or create delivering bundle for this user
    SELECT id INTO v_existing_bundle_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_bundle'
      AND user_id = v_resolved_user_id
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
        v_resolved_user_id,
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

  -- Recalculate progress for all delivering bundles
  UPDATE public.user_tasks
  SET progress_percentage = (
        SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
        FROM jsonb_array_elements(sub_items) AS item
      ), updated_at = now()
  WHERE type = 'pssr_checklist_bundle'
    AND (metadata->>'pssr_id')::text = NEW.id::text
    AND status != 'completed';

  -- ============ APPROVAL BUNDLES ============
  -- Each response has a comma-separated approving_role list; resolve each role independently
  FOR v_response IN
    SELECT r.id, r.checklist_item_id, r.approving_role, r.status, r.response
    FROM public.pssr_checklist_responses r
    WHERE r.pssr_id = NEW.id
      AND r.approving_role IS NOT NULL
      AND r.approving_role != ''
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

    -- Split comma-separated approving_role into array
    v_approving_roles := string_to_array(v_response.approving_role, ',');

    FOREACH v_role IN ARRAY v_approving_roles
    LOOP
      v_role_name := TRIM(v_role);
      IF v_role_name = '' THEN CONTINUE; END IF;

      -- Resolve role to user_id
      v_resolved_user_id := NULL;
      
      IF v_plant_name != '' THEN
        SELECT p.user_id INTO v_resolved_user_id
        FROM public.profiles p
        WHERE p.is_active = true
          AND p.position ILIKE '%' || v_role_name || '%'
          AND p.position ILIKE '%' || v_plant_name || '%'
          AND p.position NOT ILIKE '%project%'
        LIMIT 1;
      END IF;

      IF v_resolved_user_id IS NULL THEN
        SELECT p.user_id INTO v_resolved_user_id
        FROM public.profiles p
        WHERE p.is_active = true
          AND p.position ILIKE '%' || v_role_name || '%'
          AND p.position NOT ILIKE '%project%'
        ORDER BY (CASE WHEN p.position ILIKE '%Asset%' THEN 0 ELSE 1 END)
        LIMIT 1;
      END IF;

      IF v_resolved_user_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Find or create approval bundle for this user
      SELECT id INTO v_existing_bundle_id
      FROM public.user_tasks
      WHERE type = 'pssr_approval_bundle'
        AND user_id = v_resolved_user_id
        AND (metadata->>'pssr_id')::text = NEW.id::text
        AND status != 'completed'
      LIMIT 1;

      IF v_existing_bundle_id IS NOT NULL THEN
        -- Only add if not already in sub_items
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
          v_resolved_user_id,
          'PSSR Review: ' || COALESCE(NEW.pssr_id, 'Unknown'),
          'pssr_approval_bundle',
          'waiting',
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
            'project_name', NEW.project_name,
            'items_ready_for_review', 0
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Recalculate progress for all approval bundles
  UPDATE public.user_tasks
  SET progress_percentage = (
        SELECT ROUND(COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)::numeric / GREATEST(COUNT(*), 1) * 100)
        FROM jsonb_array_elements(sub_items) AS item
      ), updated_at = now()
  WHERE type = 'pssr_approval_bundle'
    AND (metadata->>'pssr_id')::text = NEW.id::text
    AND status != 'completed';

  RETURN NEW;
END;
$$;
