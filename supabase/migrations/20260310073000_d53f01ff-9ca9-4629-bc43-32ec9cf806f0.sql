
-- Trigger: When a P2A handover plan reverts to DRAFT, auto-sync the linked
-- ora_plan_activities completion_percentage and user_tasks metadata so that
-- Kanban cards and Gantt charts always reflect the correct 86% progress.

CREATE OR REPLACE FUNCTION public.sync_p2a_plan_revert_to_draft()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id UUID;
  v_plan_id UUID;
  v_activity RECORD;
BEGIN
  -- Only fire when status transitions TO 'DRAFT' from a submitted/approved state
  IF NEW.status != 'DRAFT' THEN RETURN NEW; END IF;
  IF OLD.status = 'DRAFT' THEN RETURN NEW; END IF; -- already draft, no-op

  v_project_id := NEW.project_id;

  -- Find the ORA plan for this project
  SELECT id INTO v_plan_id
  FROM public.orp_plans
  WHERE project_id = v_project_id
  LIMIT 1;

  IF v_plan_id IS NULL THEN RETURN NEW; END IF;

  -- Reset P2A-related ora_plan_activities to 86% / IN_PROGRESS
  UPDATE public.ora_plan_activities
  SET completion_percentage = 86,
      status = 'IN_PROGRESS',
      updated_at = now()
  WHERE orp_plan_id = v_plan_id
    AND (
      activity_code = 'P2A-01'
      OR LOWER(name) LIKE '%p2a%'
    )
    AND status != 'IN_PROGRESS'; -- avoid no-op writes

  -- Sync user_tasks metadata for the linked P2A creation task
  UPDATE public.user_tasks
  SET metadata = jsonb_set(
        jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{plan_status}', '"DRAFT"'
        ),
        '{completion_percentage}', '86'
      ),
      status = 'in_progress',
      updated_at = now()
  WHERE type = 'task'
    AND metadata->>'action' = 'create_p2a_plan'
    AND metadata->>'project_id' = v_project_id::text
    AND status != 'in_progress'; -- avoid no-op writes

  RETURN NEW;
END;
$$;

-- Create trigger on p2a_handover_plans
DROP TRIGGER IF EXISTS trg_sync_p2a_revert_to_draft ON public.p2a_handover_plans;
CREATE TRIGGER trg_sync_p2a_revert_to_draft
  AFTER UPDATE OF status ON public.p2a_handover_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_p2a_plan_revert_to_draft();
