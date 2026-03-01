
-- Add progress tracking columns to user_tasks
ALTER TABLE public.user_tasks 
  ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_items jsonb DEFAULT '[]'::jsonb;

-- Create trigger function to auto-update consolidated VCR bundle task progress
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

  -- Find matching vcr_checklist_bundle task(s)
  FOR v_task IN
    SELECT id, sub_items
    FROM public.user_tasks
    WHERE type = 'vcr_checklist_bundle'
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
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create the trigger on p2a_vcr_prerequisites
DROP TRIGGER IF EXISTS trg_update_delivering_party_task_progress ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_update_delivering_party_task_progress
  AFTER UPDATE ON public.p2a_vcr_prerequisites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_delivering_party_task_progress();
