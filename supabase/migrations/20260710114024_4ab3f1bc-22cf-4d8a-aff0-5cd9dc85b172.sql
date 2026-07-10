-- Extend recompute_vcr_approval_bundle_progress: stamp accepted/rejected/qualified
-- per-approver counts, and delivering_parties_count. Frontend uses these to render
-- the approver "N awaiting your review" card + Items-to-review panel.

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

    -- distinct delivering parties across the bundle's prereqs
    SELECT COUNT(DISTINCT p.delivering_party_id)
    INTO v_parties
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.p2a_vcr_prerequisites p
      ON p.id = (item->>'prerequisite_id')::uuid
    WHERE p.delivering_party_id IS NOT NULL;

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((COALESCE(v_decided,0)::numeric / v_total) * 100)
                  ELSE 0 END;

    IF COALESCE(v_decided,0) = 0 THEN
      v_new_status := v_task.status;
    ELSIF v_decided >= v_total AND v_total > 0 THEN
      v_new_status := 'completed';
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

-- Backfill: recompute existing open approver bundles so the new fields are present now.
DO $$
DECLARE
  r record;
  v_total integer;
  v_decided integer;
  v_accepted integer;
  v_rejected integer;
  v_qualified integer;
  v_parties integer;
  v_pct integer;
  v_new_status text;
BEGIN
  FOR r IN
    SELECT id, user_id, sub_items, status, progress_percentage, metadata
    FROM public.user_tasks
    WHERE type = 'vcr_approval_bundle'
  LOOP
    SELECT COUNT(*)
    INTO v_total
    FROM jsonb_array_elements(COALESCE(r.sub_items, '[]'::jsonb)) AS item
    WHERE (item->>'prerequisite_id') IS NOT NULL;

    SELECT
      COUNT(*) FILTER (WHERE vpa.status <> 'PENDING'),
      COUNT(*) FILTER (WHERE vpa.status = 'ACCEPTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'REJECTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'QUALIFIED')
    INTO v_decided, v_accepted, v_rejected, v_qualified
    FROM jsonb_array_elements(COALESCE(r.sub_items, '[]'::jsonb)) AS item
    JOIN public.vcr_prerequisite_approvals vpa
      ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
     AND vpa.approver_user_id = r.user_id;

    SELECT COUNT(DISTINCT p.delivering_party_id)
    INTO v_parties
    FROM jsonb_array_elements(COALESCE(r.sub_items, '[]'::jsonb)) AS item
    JOIN public.p2a_vcr_prerequisites p
      ON p.id = (item->>'prerequisite_id')::uuid
    WHERE p.delivering_party_id IS NOT NULL;

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((COALESCE(v_decided,0)::numeric / v_total) * 100)
                  ELSE 0 END;

    IF COALESCE(v_decided,0) = 0 THEN
      v_new_status := r.status;
    ELSIF v_decided >= v_total AND v_total > 0 THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := r.status; -- don't override completed backfill
    END IF;

    UPDATE public.user_tasks
    SET progress_percentage = v_pct,
        metadata            = COALESCE(r.metadata, '{}'::jsonb)
                              || jsonb_build_object(
                                   'approver_total_items',     v_total,
                                   'approver_decided_items',   COALESCE(v_decided,0),
                                   'approver_accepted_items',  COALESCE(v_accepted,0),
                                   'approver_rejected_items',  COALESCE(v_rejected,0),
                                   'approver_qualified_items', COALESCE(v_qualified,0),
                                   'delivering_parties_count', COALESCE(v_parties,0)
                                 ),
        updated_at          = now()
    WHERE id = r.id;
  END LOOP;
END $$;