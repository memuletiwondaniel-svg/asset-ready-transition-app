
-- 1. Add persisted progress & key activity columns to pssrs
ALTER TABLE public.pssrs
  ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_progress jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_activity_dates jsonb DEFAULT '{}';

-- 2. Add delivering/approving party columns to pssr_checklist_responses
ALTER TABLE public.pssr_checklist_responses
  ADD COLUMN IF NOT EXISTS delivering_user_id uuid REFERENCES public.profiles(user_id),
  ADD COLUMN IF NOT EXISTS delivering_role text,
  ADD COLUMN IF NOT EXISTS approving_user_id uuid REFERENCES public.profiles(user_id),
  ADD COLUMN IF NOT EXISTS approving_role text;

-- 3. Trigger function: recalculate progress_percentage and category_progress
CREATE OR REPLACE FUNCTION public.update_pssr_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pssr_id uuid;
  v_total integer;
  v_completed integer;
  v_progress integer;
  v_cat_progress jsonb;
BEGIN
  -- Determine which pssr_id was affected
  v_pssr_id := COALESCE(NEW.pssr_id, OLD.pssr_id);

  -- Overall progress
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'approved' OR response = 'YES' OR response = 'NA')
  INTO v_total, v_completed
  FROM public.pssr_checklist_responses
  WHERE pssr_id = v_pssr_id;

  v_progress := CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100) ELSE 0 END;

  -- Category progress: group by the category of the linked checklist item
  SELECT COALESCE(jsonb_object_agg(cat_id, jsonb_build_object('completed', cat_completed, 'total', cat_total)), '{}')
  INTO v_cat_progress
  FROM (
    SELECT 
      COALESCE(ci.category, cci.category, 'unknown') AS cat_id,
      COUNT(*) AS cat_total,
      COUNT(*) FILTER (WHERE r.status = 'approved' OR r.response = 'YES' OR r.response = 'NA') AS cat_completed
    FROM public.pssr_checklist_responses r
    LEFT JOIN public.pssr_checklist_items ci ON r.checklist_item_id = ci.id
    LEFT JOIN public.pssr_custom_checklist_items cci 
      ON r.checklist_item_id = 'custom-' || cci.id::text 
      AND cci.pssr_id = v_pssr_id
    WHERE r.pssr_id = v_pssr_id
    GROUP BY COALESCE(ci.category, cci.category, 'unknown')
  ) sub;

  UPDATE public.pssrs
  SET progress_percentage = v_progress,
      category_progress = v_cat_progress
  WHERE id = v_pssr_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_update_pssr_progress ON public.pssr_checklist_responses;
CREATE TRIGGER trg_update_pssr_progress
AFTER INSERT OR UPDATE OF status, response OR DELETE
ON public.pssr_checklist_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_pssr_progress();

-- 4. Trigger function: sync key activity dates to pssrs
CREATE OR REPLACE FUNCTION public.sync_key_activity_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pssr_id uuid;
  v_dates jsonb;
BEGIN
  v_pssr_id := COALESCE(NEW.pssr_id, OLD.pssr_id);

  SELECT COALESCE(
    jsonb_object_agg(
      activity_type,
      jsonb_build_object(
        'scheduled_date', scheduled_date,
        'scheduled_end_date', scheduled_end_date,
        'status', status,
        'location', location
      )
    ), '{}')
  INTO v_dates
  FROM public.pssr_key_activities
  WHERE pssr_id = v_pssr_id;

  UPDATE public.pssrs
  SET key_activity_dates = v_dates
  WHERE id = v_pssr_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_key_activity_dates ON public.pssr_key_activities;
CREATE TRIGGER trg_sync_key_activity_dates
AFTER INSERT OR UPDATE OR DELETE
ON public.pssr_key_activities
FOR EACH ROW
EXECUTE FUNCTION public.sync_key_activity_dates();

-- 5. Trigger function: manage delivering party tasks
CREATE OR REPLACE FUNCTION public.manage_delivering_party_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item_desc text;
  v_existing_task_id uuid;
BEGIN
  -- Only act on insert/update when delivering_user_id is set
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- If delivering_user_id was just set or changed
  IF NEW.delivering_user_id IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.delivering_user_id IS DISTINCT FROM NEW.delivering_user_id) THEN
    
    -- Get item description
    SELECT description INTO v_item_desc
    FROM public.pssr_checklist_items
    WHERE id = NEW.checklist_item_id;

    IF v_item_desc IS NULL THEN
      SELECT description INTO v_item_desc
      FROM public.pssr_custom_checklist_items
      WHERE id = REPLACE(NEW.checklist_item_id, 'custom-', '')::uuid;
    END IF;

    -- Check if a task already exists for this response
    SELECT id INTO v_existing_task_id
    FROM public.user_tasks
    WHERE type = 'pssr_checklist_item'
      AND (metadata->>'checklist_response_id')::text = NEW.id::text
    LIMIT 1;

    IF v_existing_task_id IS NOT NULL THEN
      -- Update existing task assignee
      UPDATE public.user_tasks
      SET user_id = NEW.delivering_user_id,
          title = COALESCE(v_item_desc, 'PSSR Checklist Item'),
          updated_at = now()
      WHERE id = v_existing_task_id;
    ELSE
      -- Create new task
      INSERT INTO public.user_tasks (user_id, title, type, status, metadata)
      VALUES (
        NEW.delivering_user_id,
        COALESCE(v_item_desc, 'PSSR Checklist Item'),
        'pssr_checklist_item',
        'pending',
        jsonb_build_object(
          'pssr_id', NEW.pssr_id,
          'checklist_response_id', NEW.id,
          'checklist_item_id', NEW.checklist_item_id
        )
      );
    END IF;
  END IF;

  -- Auto-complete task when response is approved
  IF NEW.status = 'approved' OR NEW.response = 'YES' THEN
    UPDATE public.user_tasks
    SET status = 'completed', updated_at = now()
    WHERE type = 'pssr_checklist_item'
      AND (metadata->>'checklist_response_id')::text = NEW.id::text
      AND status != 'completed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manage_delivering_party_task ON public.pssr_checklist_responses;
CREATE TRIGGER trg_manage_delivering_party_task
AFTER INSERT OR UPDATE
ON public.pssr_checklist_responses
FOR EACH ROW
EXECUTE FUNCTION public.manage_delivering_party_task();

-- 6. Seed existing PSSRs with current progress values
WITH progress_calc AS (
  SELECT 
    pssr_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'approved' OR response = 'YES' OR response = 'NA') AS completed
  FROM public.pssr_checklist_responses
  GROUP BY pssr_id
)
UPDATE public.pssrs p
SET progress_percentage = CASE WHEN pc.total > 0 THEN ROUND((pc.completed::numeric / pc.total) * 100) ELSE 0 END
FROM progress_calc pc
WHERE p.id = pc.pssr_id;

-- 7. Seed existing key activity dates
WITH activity_agg AS (
  SELECT 
    pssr_id,
    COALESCE(jsonb_object_agg(
      activity_type,
      jsonb_build_object('scheduled_date', scheduled_date, 'scheduled_end_date', scheduled_end_date, 'status', status, 'location', location)
    ), '{}') AS dates
  FROM public.pssr_key_activities
  GROUP BY pssr_id
)
UPDATE public.pssrs p
SET key_activity_dates = aa.dates
FROM activity_agg aa
WHERE p.id = aa.pssr_id;
