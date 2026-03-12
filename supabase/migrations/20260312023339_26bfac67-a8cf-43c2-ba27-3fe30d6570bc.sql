-- Remove orphaned P2A approval tasks (tasks whose plan no longer exists)
DELETE FROM public.user_tasks ut
WHERE ut.type = 'approval'
  AND ut.metadata->>'source' = 'p2a_handover'
  AND ut.metadata ? 'plan_id'
  AND NOT EXISTS (
    SELECT 1
    FROM public.p2a_handover_plans hp
    WHERE hp.id::text = ut.metadata->>'plan_id'
  );

-- Ensure approval tasks are cleaned up whenever a P2A plan is deleted
CREATE OR REPLACE FUNCTION public.cleanup_p2a_tasks_on_plan_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.user_tasks
  WHERE type = 'approval'
    AND metadata->>'source' = 'p2a_handover'
    AND metadata->>'plan_id' = OLD.id::text;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cleanup_p2a_tasks_on_plan_delete ON public.p2a_handover_plans;

CREATE TRIGGER trg_cleanup_p2a_tasks_on_plan_delete
AFTER DELETE ON public.p2a_handover_plans
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_p2a_tasks_on_plan_delete();