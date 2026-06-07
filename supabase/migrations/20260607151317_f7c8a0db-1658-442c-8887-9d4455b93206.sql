
-- ============================================================
-- E-1c: VCR prerequisite approval ledger wiring
-- ============================================================

-- 1) Fix the items_ready_for_review counter (and tidy progressive activation).
--    The previous version referenced enum values 'ISSUED' / 'SUBMITTED' that
--    do NOT exist in p2a_vcr_prerequisite_status, so the counter was a no-op.
CREATE OR REPLACE FUNCTION public.update_delivering_party_task_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task record;
  v_sub_items jsonb;
  v_total integer;
  v_completed integer;
  v_pct integer;
  v_is_completed boolean;
  v_vcr_id text;
  v_all_delivery_done boolean;
  v_ready_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_is_completed := NEW.status IN ('ACCEPTED', 'QUALIFICATION_APPROVED', 'NA');
  v_vcr_id := NEW.handover_point_id::text;

  FOR v_task IN
    SELECT id, sub_items, type, status as task_status
    FROM public.user_tasks
    WHERE type IN ('vcr_checklist_bundle', 'vcr_approval_bundle')
      AND status != 'completed'
      AND (metadata->>'vcr_id')::text = v_vcr_id
  LOOP
    SELECT jsonb_agg(
      CASE
        WHEN (item->>'prerequisite_id')::text = NEW.id::text
        THEN jsonb_set(item, '{completed}', to_jsonb(v_is_completed))
        ELSE item
      END
    )
    INTO v_sub_items
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item;

    IF v_sub_items IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_sub_items) AS item
      WHERE (item->>'prerequisite_id')::text = NEW.id::text
    ) THEN
      SELECT COUNT(*), COUNT(*) FILTER (WHERE (item->>'completed')::boolean = true)
      INTO v_total, v_completed
      FROM jsonb_array_elements(COALESCE(v_sub_items, '[]'::jsonb)) AS item;

      v_pct := CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100) ELSE 0 END;

      UPDATE public.user_tasks
      SET sub_items = v_sub_items,
          progress_percentage = v_pct,
          metadata = jsonb_set(
            jsonb_set(COALESCE(metadata, '{}'::jsonb), '{completed_items}', to_jsonb(v_completed)),
            '{total_items}', to_jsonb(v_total)
          ),
          status = CASE WHEN v_pct = 100 THEN 'completed' ELSE status END,
          updated_at = now()
      WHERE id = v_task.id;
    END IF;
  END LOOP;

  -- Progressive activation: when all delivery bundles for this VCR are done,
  -- flip waiting approval bundles to pending.
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_tasks
    WHERE type = 'vcr_checklist_bundle'
      AND (metadata->>'vcr_id')::text = v_vcr_id
      AND status != 'completed'
  ) INTO v_all_delivery_done;

  IF v_all_delivery_done THEN
    UPDATE public.user_tasks
    SET status = 'pending', updated_at = now()
    WHERE type = 'vcr_approval_bundle'
      AND (metadata->>'vcr_id')::text = v_vcr_id
      AND status = 'waiting';
  END IF;

  -- E-1c FIX: count items that are actionable-or-done from the approver's
  -- standpoint. Previous values 'ISSUED','SUBMITTED' are not enum members
  -- and silently made the counter a no-op.
  SELECT COUNT(*) INTO v_ready_count
  FROM public.p2a_vcr_prerequisites
  WHERE handover_point_id = NEW.handover_point_id
    AND status IN ('READY_FOR_REVIEW', 'ACCEPTED', 'QUALIFICATION_APPROVED',
                   'QUALIFICATION_REQUESTED', 'NA');

  UPDATE public.user_tasks
  SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb),
                           '{items_ready_for_review}',
                           to_jsonb(v_ready_count)),
      updated_at = now()
  WHERE type = 'vcr_approval_bundle'
    AND (metadata->>'vcr_id')::text = v_vcr_id;

  RETURN NEW;
END;
$function$;

-- 2) Ledger recompute trigger — rolls per-approver decisions up to the parent
--    p2a_vcr_prerequisites.status. AUTHORITATIVE all-must-approve gate.
CREATE OR REPLACE FUNCTION public.recompute_vcr_prerequisite_from_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prereq_id uuid;
  v_total int;
  v_accepted int;
  v_rejected int;
  v_qualified int;
  v_current public.p2a_vcr_prerequisite_status;
  v_target  public.p2a_vcr_prerequisite_status;
BEGIN
  -- Recursion guard. The status UPDATE below could re-trigger any prereq
  -- trigger chain; we want the ledger evaluation to run once per top-level
  -- ledger write only.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_prereq_id := COALESCE(NEW.prerequisite_id, OLD.prerequisite_id);
  IF v_prereq_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip on UPDATE if nothing meaningful changed.
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_current
    FROM public.p2a_vcr_prerequisites
   WHERE id = v_prereq_id;

  -- Do not disturb terminal/closed states. NA is admin-set; QUALIFICATION_APPROVED
  -- is the qualified-and-accepted terminus; ACCEPTED remains ACCEPTED unless
  -- a subsequent ledger change explicitly flips one row (handled below by
  -- the REJECTED/QUALIFIED branches).
  IF v_current IN ('QUALIFICATION_APPROVED', 'NA') THEN
    RETURN NEW;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ACCEPTED'),
    COUNT(*) FILTER (WHERE status = 'REJECTED'),
    COUNT(*) FILTER (WHERE status = 'QUALIFIED')
  INTO v_total, v_accepted, v_rejected, v_qualified
  FROM public.vcr_prerequisite_approvals
  WHERE prerequisite_id = v_prereq_id;

  IF v_total = 0 THEN
    RETURN NEW;
  END IF;

  -- Precedence: a single rejection or qualification request is dispositive;
  -- ACCEPTED requires unanimity. Otherwise leave the prereq in its working
  -- state (typically READY_FOR_REVIEW).
  IF v_rejected > 0 THEN
    v_target := 'REJECTED';
  ELSIF v_qualified > 0 THEN
    v_target := 'QUALIFICATION_REQUESTED';
  ELSIF v_accepted = v_total THEN
    v_target := 'ACCEPTED';
  ELSE
    RETURN NEW;
  END IF;

  IF v_target IS DISTINCT FROM v_current THEN
    UPDATE public.p2a_vcr_prerequisites
       SET status = v_target,
           reviewed_at = CASE
             WHEN v_target IN ('ACCEPTED','REJECTED') THEN now()
             ELSE reviewed_at
           END,
           updated_at = now()
     WHERE id = v_prereq_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_recompute_vcr_prereq_from_approvals
  ON public.vcr_prerequisite_approvals;

CREATE TRIGGER trg_recompute_vcr_prereq_from_approvals
AFTER INSERT OR UPDATE OF status
ON public.vcr_prerequisite_approvals
FOR EACH ROW
EXECUTE FUNCTION public.recompute_vcr_prerequisite_from_approvals();

-- 3) RLS tightening on vcr_prerequisite_approvals.
--    Previous: read=true, write ALL with check=true (anyone authenticated
--    could write any row). E-1c: read open to authenticated; write restricted
--    to the assigned approver's own row (or service_role for backend triggers).
DROP POLICY IF EXISTS "vcr_prereq_approvals read auth"  ON public.vcr_prerequisite_approvals;
DROP POLICY IF EXISTS "vcr_prereq_approvals write auth" ON public.vcr_prerequisite_approvals;
DROP POLICY IF EXISTS "vcr_prereq_approvals insert own" ON public.vcr_prerequisite_approvals;
DROP POLICY IF EXISTS "vcr_prereq_approvals update own" ON public.vcr_prerequisite_approvals;
DROP POLICY IF EXISTS "vcr_prereq_approvals select auth" ON public.vcr_prerequisite_approvals;

CREATE POLICY "vcr_prereq_approvals select auth"
  ON public.vcr_prerequisite_approvals
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserts arrive almost exclusively from SECURITY DEFINER triggers
-- (create_vcr_approval_fanout). Permit a self-row insert too for
-- forward-compat with any client-side seeding path.
CREATE POLICY "vcr_prereq_approvals insert own"
  ON public.vcr_prerequisite_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (approver_user_id = auth.uid());

-- The action surface (Accept/Reject/Qualify) writes only the row that
-- belongs to the current user. The auth.uid() check appears on both USING
-- (you must be the row's approver to find/lock it) and WITH CHECK (you
-- can't reassign the row to someone else).
CREATE POLICY "vcr_prereq_approvals update own"
  ON public.vcr_prerequisite_approvals
  FOR UPDATE
  TO authenticated
  USING (approver_user_id = auth.uid())
  WITH CHECK (approver_user_id = auth.uid());

-- No DELETE policy for authenticated — ledger rows are append/update only.
-- service_role retains ALL via GRANT.
