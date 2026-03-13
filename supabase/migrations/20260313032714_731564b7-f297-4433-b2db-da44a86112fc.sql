-- Prevent premature approval task creation while plan is still draft
CREATE OR REPLACE FUNCTION public.auto_create_p2a_approval_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan RECORD;
  v_existing INTEGER;
  v_phase INTEGER;
  v_task_title TEXT;
  v_task_desc TEXT;
BEGIN
  -- Must have a user_id assigned
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Get plan details
  SELECT id, project_id, project_code, status
  INTO v_plan
  FROM public.p2a_handover_plans
  WHERE id = NEW.handover_id;

  IF v_plan IS NULL THEN RETURN NEW; END IF;

  -- Only create approval tasks once the plan is submitted for review
  IF v_plan.status IS DISTINCT FROM 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- Determine approval phase based on role
  IF NEW.role_name = 'Deputy Plant Director' THEN
    v_phase := 2;
    v_task_title := 'Final Approval – P2A Plan ' || COALESCE(v_plan.project_code, '');
    v_task_desc := 'Technical review is complete. As ' || NEW.role_name || ', please provide your final approval for the P2A Plan for project ' || COALESCE(v_plan.project_code, '') || '.';
  ELSE
    v_phase := 1;
    v_task_title := 'Review & Approve P2A Plan – ' || COALESCE(v_plan.project_code, '');
    v_task_desc := 'You have been assigned as ' || NEW.role_name || ' to review and approve the P2A Plan for project ' || COALESCE(v_plan.project_code, '') || '. Please review the plan and provide your approval.';
  END IF;

  -- Strengthened duplicate prevention: check user + plan + role + source
  SELECT COUNT(*) INTO v_existing
  FROM public.user_tasks
  WHERE user_id = NEW.user_id
    AND type = 'approval'
    AND metadata->>'plan_id' = NEW.handover_id::text
    AND metadata->>'source' = 'p2a_handover'
    AND metadata->>'approver_role' = NEW.role_name
    AND status NOT IN ('completed', 'cancelled');

  IF v_existing > 0 THEN RETURN NEW; END IF;

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata)
  VALUES (
    NEW.user_id,
    v_task_title,
    v_task_desc,
    'approval',
    CASE WHEN v_phase = 2 THEN 'waiting' ELSE 'pending' END,
    'High',
    jsonb_build_object(
      'plan_id', NEW.handover_id,
      'project_id', v_plan.project_id,
      'project_code', v_plan.project_code,
      'approver_role', NEW.role_name,
      'approval_phase', v_phase,
      'source', 'p2a_handover'
    )
  );

  RETURN NEW;
END;
$function$;

-- Clean up any currently-open approval tasks that belong to draft plans
UPDATE public.user_tasks AS t
SET status = 'cancelled',
    updated_at = now()
WHERE t.type = 'approval'
  AND t.status IN ('pending', 'waiting')
  AND t.metadata->>'source' = 'p2a_handover'
  AND EXISTS (
    SELECT 1
    FROM public.p2a_handover_plans p
    WHERE p.id = (t.metadata->>'plan_id')::uuid
      AND p.status = 'DRAFT'
  );