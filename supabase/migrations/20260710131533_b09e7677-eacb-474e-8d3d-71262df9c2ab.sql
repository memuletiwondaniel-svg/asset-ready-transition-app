
-- Server-side mirror: VCR bundle user_tasks → ora_plan_activities
-- Trigger keeps Gantt (ora_plan_activities) in lock-step with Kanban (user_tasks)
-- for vcr_checklist_bundle / vcr_approval_bundle, independent of any client hook.

CREATE OR REPLACE FUNCTION public._mirror_vcr_bundle_to_ora_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_orp_plan_id uuid;
  v_vcr_label text;
  v_vcr_code text;
  v_activity_code text;
  v_status text;
  v_completion int;
  v_total int;
  v_done int;
BEGIN
  -- DELETE: drop mirror
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.ora_plan_activities
     WHERE source_type = 'vcr_bundle_task'
       AND source_ref_table = 'user_tasks'
       AND source_ref_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Only mirror bundle types
  IF NEW.type NOT IN ('vcr_checklist_bundle','vcr_approval_bundle') THEN
    RETURN NEW;
  END IF;

  v_project_id := NULLIF(NEW.metadata->>'project_id','')::uuid;
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_orp_plan_id
    FROM public.orp_plans
   WHERE project_id = v_project_id AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_orp_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_vcr_label := COALESCE(NEW.metadata->>'vcr_label','VCR');
  v_vcr_code := split_part(v_vcr_label, ':', 1);       -- "VCR-DP300-02"
  IF v_vcr_code IS NULL OR v_vcr_code = '' THEN
    v_vcr_code := 'VCR';
  END IF;

  -- Unique per bundle task: {vcr_code}.{APR|DEL}.{first-8 of task uuid}
  v_activity_code := v_vcr_code
    || '.' || (CASE WHEN NEW.type='vcr_approval_bundle' THEN 'APR' ELSE 'DEL' END)
    || '.' || substring(NEW.id::text, 1, 8);

  v_status := CASE lower(COALESCE(NEW.status,''))
                WHEN 'completed'   THEN 'COMPLETED'
                WHEN 'in_progress' THEN 'IN_PROGRESS'
                WHEN 'cancelled'   THEN 'NOT_STARTED'
                ELSE 'NOT_STARTED'      -- waiting / pending
              END;

  v_total := COALESCE(NULLIF(NEW.metadata->>'total_items','')::int, 0);
  v_done  := COALESCE(NULLIF(NEW.metadata->>'completed_items','')::int, 0);
  v_completion := CASE
    WHEN v_status = 'COMPLETED' THEN 100
    WHEN NEW.progress_percentage IS NOT NULL AND NEW.progress_percentage > 0 THEN NEW.progress_percentage
    WHEN v_total > 0 THEN LEAST(100, GREATEST(0, (v_done * 100) / v_total))
    ELSE 0
  END;

  -- Idempotent upsert on (source_type, source_ref_table, source_ref_id)
  UPDATE public.ora_plan_activities
     SET orp_plan_id  = v_orp_plan_id,
         activity_code = v_activity_code,
         name         = NEW.title,
         status       = v_status,
         completion_percentage = v_completion,
         updated_at   = now()
   WHERE source_type = 'vcr_bundle_task'
     AND source_ref_table = 'user_tasks'
     AND source_ref_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.ora_plan_activities (
      orp_plan_id, activity_code, name,
      source_type, source_ref_id, source_ref_table,
      status, completion_percentage, assigned_to, task_id
    ) VALUES (
      v_orp_plan_id, v_activity_code, NEW.title,
      'vcr_bundle_task', NEW.id, 'user_tasks',
      v_status, v_completion, NEW.user_id, NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_vcr_bundle_ins ON public.user_tasks;
DROP TRIGGER IF EXISTS trg_mirror_vcr_bundle_upd ON public.user_tasks;
DROP TRIGGER IF EXISTS trg_mirror_vcr_bundle_del ON public.user_tasks;

CREATE TRIGGER trg_mirror_vcr_bundle_ins
AFTER INSERT ON public.user_tasks
FOR EACH ROW
WHEN (NEW.type IN ('vcr_checklist_bundle','vcr_approval_bundle'))
EXECUTE FUNCTION public._mirror_vcr_bundle_to_ora_activity();

CREATE TRIGGER trg_mirror_vcr_bundle_upd
AFTER UPDATE OF status, title, progress_percentage, metadata, sub_items, type
ON public.user_tasks
FOR EACH ROW
WHEN (NEW.type IN ('vcr_checklist_bundle','vcr_approval_bundle')
   OR OLD.type IN ('vcr_checklist_bundle','vcr_approval_bundle'))
EXECUTE FUNCTION public._mirror_vcr_bundle_to_ora_activity();

CREATE TRIGGER trg_mirror_vcr_bundle_del
AFTER DELETE ON public.user_tasks
FOR EACH ROW
WHEN (OLD.type IN ('vcr_checklist_bundle','vcr_approval_bundle'))
EXECUTE FUNCTION public._mirror_vcr_bundle_to_ora_activity();

-- Backfill: re-stamp every existing bundle so mirrors are created.
-- A no-op UPDATE fires the trigger and creates/updates the mirror row.
UPDATE public.user_tasks
   SET updated_at = updated_at
 WHERE type IN ('vcr_checklist_bundle','vcr_approval_bundle');
