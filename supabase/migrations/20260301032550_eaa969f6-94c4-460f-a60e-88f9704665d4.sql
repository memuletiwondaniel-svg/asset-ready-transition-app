
-- Update trigger to also handle approving party (vcr_approval_bundle) tasks
CREATE OR REPLACE FUNCTION public.update_delivering_party_task_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task record;
  v_sub_items jsonb;
  v_total integer;
  v_completed integer;
  v_pct integer;
  v_is_completed boolean;
BEGIN
  -- Only act when status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_is_completed := NEW.status IN ('ACCEPTED', 'QUALIFICATION_APPROVED', 'NA');

  -- Find matching bundle tasks (both delivering and approving)
  FOR v_task IN
    SELECT id, sub_items
    FROM public.user_tasks
    WHERE type IN ('vcr_checklist_bundle', 'vcr_approval_bundle')
      AND status != 'completed'
      AND (metadata->>'vcr_id')::text = NEW.handover_point_id::text
  LOOP
    -- Update the sub_items array: mark the matching prerequisite
    SELECT jsonb_agg(
      CASE 
        WHEN (item->>'prerequisite_id')::text = NEW.id::text
        THEN jsonb_set(item, '{completed}', to_jsonb(v_is_completed))
        ELSE item
      END
    )
    INTO v_sub_items
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item;

    -- Only update if this prerequisite is actually in the sub_items
    IF v_sub_items IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_sub_items) AS item
      WHERE (item->>'prerequisite_id')::text = NEW.id::text
    ) THEN
      -- Calculate progress
      SELECT COUNT(*), COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)
      INTO v_total, v_completed
      FROM jsonb_array_elements(COALESCE(v_sub_items, '[]'::jsonb)) AS item;

      v_pct := CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100) ELSE 0 END;

      -- Update the task
      UPDATE public.user_tasks
      SET sub_items = v_sub_items,
          progress_percentage = v_pct,
          metadata = jsonb_set(
            jsonb_set(COALESCE(metadata, '{}'::jsonb), '{completed_items}', to_jsonb(v_completed)),
            '{total_items}', to_jsonb(v_total)
          ),
          status = CASE WHEN v_pct = 100 THEN 'completed' ELSE status END,
          updated_at = now()
      WHERE id = v_task.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
