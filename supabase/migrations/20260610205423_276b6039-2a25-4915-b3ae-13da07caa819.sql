
-- ============================================================
-- E-1c BUG 2: Per-approver vcr_approval_bundle progress recompute
-- Trigger fires on vcr_prerequisite_approvals writes.
-- For the affected approver_user_id, finds matching user_tasks rows
-- (type='vcr_approval_bundle', user_id=approver_user_id) whose
-- sub_items contain the changed prerequisite_id, then recomputes
-- progress_percentage and status from that approver's ledger.
--
-- Safety:
--   * pg_trigger_depth() guard prevents nested re-entry.
--   * Idempotent: only writes when computed values differ from current.
--   * Does NOT touch generation (create_vcr_approval_fanout) or the
--     prereq recompute trigger (recompute_vcr_prerequisite_from_approvals).
-- ============================================================

CREATE OR REPLACE FUNCTION public.recompute_vcr_approval_bundle_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_approver  uuid;
  v_prereq    uuid;
  v_task      record;
  v_total     integer;
  v_decided   integer;
  v_pct       integer;
  v_new_status text;
BEGIN
  -- Recursion guard: ignore if invoked from within another trigger.
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_approver := COALESCE(NEW.approver_user_id, OLD.approver_user_id);
  v_prereq   := COALESCE(NEW.prerequisite_id,  OLD.prerequisite_id);

  IF v_approver IS NULL OR v_prereq IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Find every approval bundle owned by this approver that contains the prereq.
  FOR v_task IN
    SELECT ut.id, ut.sub_items, ut.status, ut.progress_percentage, ut.metadata
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND ut.user_id = v_approver
      AND ut.status <> 'completed'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = v_prereq
      )
  LOOP
    -- Total = number of sub_items with a prerequisite_id.
    SELECT COUNT(*)
    INTO v_total
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    WHERE (item->>'prerequisite_id') IS NOT NULL;

    -- Decided = this approver's ledger rows on those prereqs whose status <> PENDING.
    SELECT COUNT(*)
    INTO v_decided
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.vcr_prerequisite_approvals vpa
      ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
     AND vpa.approver_user_id = v_approver
     AND vpa.status <> 'PENDING';

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((v_decided::numeric / v_total) * 100)
                  ELSE 0 END;

    -- Status mapping (option a — per-approver worklist):
    --   0 decisions               -> leave current status (don't fight the
    --                                progressive-activation 'waiting'->'pending'
    --                                flip in update_delivering_party_task_progress)
    --   some decisions, not all   -> 'in_progress'
    --   all decisions made        -> 'completed'
    IF v_decided = 0 THEN
      v_new_status := v_task.status;
    ELSIF v_decided >= v_total AND v_total > 0 THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := 'in_progress';
    END IF;

    -- Idempotent: only write when something actually changed.
    IF v_task.progress_percentage IS DISTINCT FROM v_pct
       OR v_task.status IS DISTINCT FROM v_new_status THEN
      UPDATE public.user_tasks
      SET progress_percentage = v_pct,
          status              = v_new_status,
          metadata            = jsonb_set(
                                  jsonb_set(
                                    COALESCE(v_task.metadata, '{}'::jsonb),
                                    '{approver_decided_items}', to_jsonb(v_decided)
                                  ),
                                  '{approver_total_items}', to_jsonb(v_total)
                                ),
          updated_at          = now()
      WHERE id = v_task.id;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_recompute_vcr_approval_bundle_progress
  ON public.vcr_prerequisite_approvals;

CREATE TRIGGER trg_recompute_vcr_approval_bundle_progress
AFTER INSERT OR UPDATE OF status ON public.vcr_prerequisite_approvals
FOR EACH ROW
EXECUTE FUNCTION public.recompute_vcr_approval_bundle_progress();

-- ============================================================
-- One-time backfill: recompute every existing approver bundle now.
-- ============================================================
DO $$
DECLARE
  r record;
  v_total integer;
  v_decided integer;
  v_pct integer;
  v_new_status text;
BEGIN
  FOR r IN
    SELECT id, user_id, sub_items, status, progress_percentage, metadata
    FROM public.user_tasks
    WHERE type = 'vcr_approval_bundle'
      AND status <> 'completed'
  LOOP
    SELECT COUNT(*)
    INTO v_total
    FROM jsonb_array_elements(COALESCE(r.sub_items, '[]'::jsonb)) AS item
    WHERE (item->>'prerequisite_id') IS NOT NULL;

    SELECT COUNT(*)
    INTO v_decided
    FROM jsonb_array_elements(COALESCE(r.sub_items, '[]'::jsonb)) AS item
    JOIN public.vcr_prerequisite_approvals vpa
      ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
     AND vpa.approver_user_id = r.user_id
     AND vpa.status <> 'PENDING';

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((v_decided::numeric / v_total) * 100)
                  ELSE 0 END;

    IF v_decided = 0 THEN
      v_new_status := r.status;
    ELSIF v_decided >= v_total AND v_total > 0 THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := 'in_progress';
    END IF;

    IF r.progress_percentage IS DISTINCT FROM v_pct
       OR r.status IS DISTINCT FROM v_new_status THEN
      UPDATE public.user_tasks
      SET progress_percentage = v_pct,
          status              = v_new_status,
          metadata            = jsonb_set(
                                  jsonb_set(
                                    COALESCE(r.metadata, '{}'::jsonb),
                                    '{approver_decided_items}', to_jsonb(v_decided)
                                  ),
                                  '{approver_total_items}', to_jsonb(v_total)
                                ),
          updated_at          = now()
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
