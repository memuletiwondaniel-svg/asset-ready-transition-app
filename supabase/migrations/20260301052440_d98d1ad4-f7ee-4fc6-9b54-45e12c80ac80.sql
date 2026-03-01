
-- =====================================================================
-- TRIGGER 1: Auto-create PSSR review task when PSSR status changes to PENDING_LEAD_REVIEW
-- Replaces: frontend self-healing code in PSSRReviewsPanel.tsx
-- =====================================================================
CREATE OR REPLACE FUNCTION public.auto_create_pssr_review_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing INTEGER;
BEGIN
  -- Only fire when status transitions TO 'PENDING_LEAD_REVIEW'
  IF NEW.status != 'PENDING_LEAD_REVIEW' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PENDING_LEAD_REVIEW' THEN RETURN NEW; END IF;

  -- Must have a lead assigned
  IF NEW.pssr_lead_id IS NULL THEN RETURN NEW; END IF;

  -- Duplicate prevention
  SELECT COUNT(*) INTO v_existing
  FROM public.user_tasks
  WHERE user_id = NEW.pssr_lead_id
    AND type = 'review'
    AND metadata->>'pssr_id' = NEW.id::text
    AND metadata->>'source' = 'pssr_workflow'
    AND status NOT IN ('completed', 'cancelled');

  IF v_existing > 0 THEN RETURN NEW; END IF;

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata)
  VALUES (
    NEW.pssr_lead_id,
    'Review Draft PSSR: ' || COALESCE(NEW.title, NEW.pssr_id),
    'A PSSR has been submitted for your review. Please review the PSSR items, approvers, and scope, then approve, edit, or reject the draft.',
    'review',
    'pending',
    'High',
    jsonb_build_object(
      'source', 'pssr_workflow',
      'pssr_id', NEW.id,
      'pssr_code', NEW.pssr_id,
      'action', 'review_draft_pssr'
    )
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_create_pssr_review_task
  AFTER INSERT OR UPDATE OF status ON public.pssrs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_pssr_review_task();


-- =====================================================================
-- TRIGGER 2: Auto-create P2A approval tasks when approvers are inserted
-- Replaces: frontend code in useP2APlanWizard.ts (Phase 1) and useP2AApprovalTasks.ts (Phase 2)
-- =====================================================================
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

  -- Duplicate prevention
  SELECT COUNT(*) INTO v_existing
  FROM public.user_tasks
  WHERE user_id = NEW.user_id
    AND type = 'approval'
    AND metadata->>'plan_id' = NEW.handover_id::text
    AND metadata->>'source' = 'p2a_handover'
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

CREATE TRIGGER trg_auto_create_p2a_approval_task
  AFTER INSERT OR UPDATE OF user_id ON public.p2a_handover_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_p2a_approval_task();


-- =====================================================================
-- TRIGGER 3: Auto-activate Phase 2 tasks when all Phase 1 approvers approve
-- Replaces: frontend createPhase2Tasks() in useP2AApprovalTasks.ts
-- =====================================================================
CREATE OR REPLACE FUNCTION public.auto_activate_p2a_phase2_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_all_phase1_approved BOOLEAN;
BEGIN
  -- Only fire when status changes to APPROVED
  IF NEW.status != 'APPROVED' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'APPROVED' THEN RETURN NEW; END IF;

  -- Skip if this IS the Deputy Plant Director (Phase 2)
  IF NEW.role_name = 'Deputy Plant Director' THEN RETURN NEW; END IF;

  -- Check if ALL Phase 1 approvers (non-Deputy Plant Director) are approved
  SELECT NOT EXISTS (
    SELECT 1 FROM public.p2a_handover_approvers
    WHERE handover_id = NEW.handover_id
      AND role_name != 'Deputy Plant Director'
      AND status != 'APPROVED'
  ) INTO v_all_phase1_approved;

  IF v_all_phase1_approved THEN
    -- Activate any waiting Phase 2 tasks
    UPDATE public.user_tasks
    SET status = 'pending', updated_at = now()
    WHERE type = 'approval'
      AND status = 'waiting'
      AND metadata->>'plan_id' = NEW.handover_id::text
      AND metadata->>'source' = 'p2a_handover'
      AND (metadata->>'approval_phase')::int = 2;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_activate_p2a_phase2
  AFTER UPDATE OF status ON public.p2a_handover_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_p2a_phase2_tasks();
