-- Fix "Needs-review-in-Done" pathology for VCR bundle tasks.
--
-- (a) Trigger reopens completed approver bundles when undecided > 0.
--     Also promotes to 'completed' when all decided.
-- (c) One-time backfill: reopens any completed vcr_approval_bundle /
--     vcr_checklist_bundle whose trigger counts show outstanding work.

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
  v_accepted  integer;
  v_rejected  integer;
  v_qualified integer;
  v_parties   integer;
  v_pct       integer;
  v_new_status text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_approver := COALESCE(NEW.approver_user_id, OLD.approver_user_id);
  v_prereq   := COALESCE(NEW.prerequisite_id,  OLD.prerequisite_id);

  IF v_approver IS NULL OR v_prereq IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Note: no longer filter out status='completed' — we may need to
  -- reopen a bundle that was previously completed but now has fresh
  -- outstanding ledger rows.
  FOR v_task IN
    SELECT ut.id, ut.sub_items, ut.status, ut.progress_percentage, ut.metadata
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND ut.user_id = v_approver
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = v_prereq
      )
  LOOP
    SELECT COUNT(*)
    INTO v_total
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    WHERE (item->>'prerequisite_id') IS NOT NULL;

    SELECT
      COUNT(*) FILTER (WHERE vpa.status <> 'PENDING'),
      COUNT(*) FILTER (WHERE vpa.status = 'ACCEPTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'REJECTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'QUALIFIED')
    INTO v_decided, v_accepted, v_rejected, v_qualified
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.vcr_prerequisite_approvals vpa
      ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
     AND vpa.approver_user_id = v_approver;

    SELECT COUNT(DISTINCT p.delivering_party_id)
    INTO v_parties
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.p2a_vcr_prerequisites p
      ON p.id = (item->>'prerequisite_id')::uuid
    WHERE p.delivering_party_id IS NOT NULL;

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((COALESCE(v_decided,0)::numeric / v_total) * 100)
                  ELSE 0 END;

    -- Status rules — coherent with counts:
    --   all decided (undecided=0) AND total>0  → completed
    --   any undecided                          → in_progress
    --                                            (except pristine: no
    --                                            decisions AND task was
    --                                            todo/pending → keep as-is)
    IF v_total > 0 AND COALESCE(v_decided,0) >= v_total THEN
      v_new_status := 'completed';
    ELSIF COALESCE(v_decided,0) = 0
          AND v_task.status IN ('pending','todo') THEN
      v_new_status := v_task.status;
    ELSE
      v_new_status := 'in_progress';
    END IF;

    UPDATE public.user_tasks
    SET progress_percentage = v_pct,
        status              = v_new_status,
        metadata            = COALESCE(v_task.metadata, '{}'::jsonb)
                              || jsonb_build_object(
                                   'approver_total_items',     v_total,
                                   'approver_decided_items',   COALESCE(v_decided,0),
                                   'approver_accepted_items',  COALESCE(v_accepted,0),
                                   'approver_rejected_items',  COALESCE(v_rejected,0),
                                   'approver_qualified_items', COALESCE(v_qualified,0),
                                   'delivering_parties_count', COALESCE(v_parties,0)
                                 ),
        updated_at          = now()
    WHERE id = v_task.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Backfill: reopen any completed approver bundle whose counts show undecided > 0.
UPDATE public.user_tasks ut
SET status = CASE
               WHEN COALESCE((ut.metadata->>'approver_decided_items')::int, 0) = 0
                 THEN 'pending'
               ELSE 'in_progress'
             END,
    updated_at = now()
WHERE ut.type = 'vcr_approval_bundle'
  AND ut.status = 'completed'
  AND COALESCE((ut.metadata->>'approver_total_items')::int, 0)
      > COALESCE((ut.metadata->>'approver_decided_items')::int, 0);

-- Backfill: reopen any completed checklist bundle with un-completed sub_items.
UPDATE public.user_tasks ut
SET status = 'in_progress',
    updated_at = now()
WHERE ut.type = 'vcr_checklist_bundle'
  AND ut.status = 'completed'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
    WHERE COALESCE((item->>'completed')::boolean, false) = false
  );