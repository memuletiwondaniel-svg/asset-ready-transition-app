
-- Redefine awaiting semantics + status mapping for approval bundles.
-- awaiting = user's PENDING ledger rows whose prereq is submitted-and-undecided
--            (status IN READY_FOR_REVIEW, QUALIFICATION_REQUESTED)
CREATE OR REPLACE FUNCTION public.recompute_vcr_approval_bundle_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_approver uuid; v_prereq uuid; v_task record;
  v_total int; v_decided int; v_awaiting int;
  v_accepted int; v_rejected int; v_qualified int; v_parties int;
  v_pct int; v_new_status text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  v_approver := COALESCE(NEW.approver_user_id, OLD.approver_user_id);
  v_prereq   := COALESCE(NEW.prerequisite_id,  OLD.prerequisite_id);
  IF v_approver IS NULL OR v_prereq IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  FOR v_task IN
    SELECT ut.id, ut.sub_items, ut.status, ut.metadata
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle' AND ut.user_id = v_approver
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items,'[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = v_prereq
      )
  LOOP
    PERFORM public._recompute_vcr_approval_bundle_row(v_task.id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END
$fn$;

-- Row-level worker; shared by ledger trigger and prereq-status trigger.
CREATE OR REPLACE FUNCTION public._recompute_vcr_approval_bundle_row(p_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_user uuid; v_sub jsonb; v_meta jsonb;
  v_total int; v_decided int; v_awaiting int;
  v_accepted int; v_rejected int; v_qualified int; v_parties int;
  v_pct int; v_new_status text;
BEGIN
  SELECT user_id, sub_items, metadata INTO v_user, v_sub, v_meta
    FROM public.user_tasks WHERE id = p_task_id;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_total
    FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) item
    WHERE (item->>'prerequisite_id') IS NOT NULL;

  SELECT
    COUNT(*) FILTER (WHERE vpa.status <> 'PENDING'),
    -- NEW awaiting: PENDING ledger row AND prereq is submitted for review
    COUNT(*) FILTER (WHERE vpa.status = 'PENDING'
                     AND p.status IN ('READY_FOR_REVIEW','QUALIFICATION_REQUESTED')),
    COUNT(*) FILTER (WHERE vpa.status = 'ACCEPTED'),
    COUNT(*) FILTER (WHERE vpa.status = 'REJECTED'),
    COUNT(*) FILTER (WHERE vpa.status = 'QUALIFIED')
  INTO v_decided, v_awaiting, v_accepted, v_rejected, v_qualified
  FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) item
  JOIN public.vcr_prerequisite_approvals vpa
    ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
   AND vpa.approver_user_id = v_user
  JOIN public.p2a_vcr_prerequisites p
    ON p.id = (item->>'prerequisite_id')::uuid;

  SELECT COUNT(DISTINCT p.delivering_party_id) INTO v_parties
    FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) item
    JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid
    WHERE p.delivering_party_id IS NOT NULL;

  v_pct := CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_decided,0)::numeric / v_total) * 100) ELSE 0 END;

  IF v_total > 0 AND COALESCE(v_decided,0) >= v_total THEN
    v_new_status := 'completed';
  ELSIF COALESCE(v_awaiting,0) > 0 THEN
    v_new_status := 'pending';
  ELSIF COALESCE(v_decided,0) > 0 THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'waiting';
  END IF;

  UPDATE public.user_tasks
     SET progress_percentage = v_pct,
         status = v_new_status,
         metadata = COALESCE(v_meta,'{}'::jsonb) || jsonb_build_object(
           'approver_total_items',    v_total,
           'approver_decided_items',  COALESCE(v_decided,0),
           'approver_awaiting_items', COALESCE(v_awaiting,0),
           'approver_accepted_items', COALESCE(v_accepted,0),
           'approver_rejected_items', COALESCE(v_rejected,0),
           'approver_qualified_items',COALESCE(v_qualified,0),
           'delivering_parties_count',COALESCE(v_parties,0)
         ),
         updated_at = now()
   WHERE id = p_task_id;
END
$fn$;

-- Trigger on prereq status changes → recompute affected bundles.
CREATE OR REPLACE FUNCTION public.trg_recompute_approval_bundles_on_prereq_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_task_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  FOR v_task_id IN
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items,'[]'::jsonb)) item
        WHERE (item->>'prerequisite_id')::uuid = NEW.id
      )
  LOOP
    PERFORM public._recompute_vcr_approval_bundle_row(v_task_id);
  END LOOP;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_recompute_approval_bundles_on_prereq_status ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_recompute_approval_bundles_on_prereq_status
  AFTER UPDATE OF status ON public.p2a_vcr_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_approval_bundles_on_prereq_status();
