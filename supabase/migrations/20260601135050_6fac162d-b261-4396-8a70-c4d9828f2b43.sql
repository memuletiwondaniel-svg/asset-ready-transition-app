-- Mig 10b — derived-status trigger + bypass guard for orp_plans.status.
--
-- Gate fn orp_plan_is_approved(uuid) ALREADY EXISTS and matches the
-- p2a_plan_is_approved shape exactly (COUNT(DISTINCT approver_role) on the
-- spec set, joined to roles for active/non-retired, legacy ⇒ true). Do NOT
-- recreate it — preserves the single-source-of-truth invariant.
--
-- This migration only adds the two pieces that were missing: a trigger that
-- reads the gate fn and a guard that prevents bypassing it.

CREATE OR REPLACE FUNCTION public.derive_orp_plan_status_from_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'APPROVED') THEN
    IF public.orp_plan_is_approved(NEW.orp_plan_id) THEN
      UPDATE public.orp_plans
        SET status = 'APPROVED'
        WHERE id = NEW.orp_plan_id
          AND status IS DISTINCT FROM 'APPROVED';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_derive_orp_plan_status ON public.orp_approvals;
CREATE TRIGGER trg_derive_orp_plan_status
  AFTER UPDATE OF status ON public.orp_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_orp_plan_status_from_approvals();

-- Bypass guard. Routed through orp_plan_is_approved() so the legacy
-- short-circuit (gate_model='legacy' ⇒ true) is honored — no raw row check.
CREATE OR REPLACE FUNCTION public.guard_orp_plan_approved_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED' THEN
    IF NOT public.orp_plan_is_approved(NEW.id) THEN
      RAISE EXCEPTION
        'orp_plans.status=APPROVED rejected: per-approver gate not satisfied for plan %',
        NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_orp_plan_approved ON public.orp_plans;
CREATE TRIGGER trg_guard_orp_plan_approved
  BEFORE UPDATE OF status ON public.orp_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_orp_plan_approved_status();