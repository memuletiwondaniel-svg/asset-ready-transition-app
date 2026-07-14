-- Reset ledger rows when a prerequisite re-enters an actionable state
-- (resubmission = READY_FOR_REVIEW, or rollback to IN_PROGRESS). Terminal
-- states (ACCEPTED / QUALIFICATION_APPROVED / NA) are never touched. Fires on
-- ANY status write path (direct UPDATE from useVCRPrerequisites.handleSubmit-
-- ForReview + any future RPC), so a fresh review round always starts clean.

CREATE OR REPLACE FUNCTION public.reset_vcr_ledger_on_resubmit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  -- Only act on real status transitions.
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Reentry into an actionable review state = start a clean round.
  -- READY_FOR_REVIEW = delivering-party resubmission after a Return.
  -- IN_PROGRESS      = deliverer walked the item back to draft.
  IF NEW.status NOT IN ('READY_FOR_REVIEW','IN_PROGRESS') THEN
    RETURN NEW;
  END IF;

  -- Guard: never disturb ledger rows if the prereq is terminal. (Defence in
  -- depth; the status filter above already excludes terminal states, but a
  -- future enum expansion could regress this.)
  IF NEW.status IN ('ACCEPTED','QUALIFICATION_APPROVED','NA') THEN
    RETURN NEW;
  END IF;

  -- Reset every non-PENDING ledger row on this prereq so the next round of
  -- approver decisions recomputes from a clean slate. REJECTED and stale
  -- ACCEPTED/QUALIFIED/SUPERSEDED rows all fold back to PENDING with
  -- decided_at and comment cleared. The recompute trigger has a
  -- pg_trigger_depth() > 1 guard so this cascade does not fight itself.
  UPDATE public.vcr_prerequisite_approvals
     SET status = 'PENDING',
         decided_at = NULL,
         comment = NULL,
         updated_at = now()
   WHERE prerequisite_id = NEW.id
     AND status <> 'PENDING';

  -- Re-stamp paired approval bundles so approver_decided_items /
  -- approver_accepted_items counters and the "awaiting your review" panel
  -- classifier reflect the fresh round.
  FOR v_task_id IN
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND ut.status NOT IN ('completed','cancelled','cancelled_superseded')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items,'[]'::jsonb)) item
        WHERE (item->>'prerequisite_id')::uuid = NEW.id
      )
  LOOP
    PERFORM public._recompute_vcr_approval_bundle_row(v_task_id);
  END LOOP;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_reset_vcr_ledger_on_resubmit ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_reset_vcr_ledger_on_resubmit
AFTER UPDATE OF status ON public.p2a_vcr_prerequisites
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.reset_vcr_ledger_on_resubmit();