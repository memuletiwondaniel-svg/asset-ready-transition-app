CREATE OR REPLACE FUNCTION public.recompute_vcr_prerequisite_from_approvals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prereq_id uuid;
  v_total int; v_accepted int; v_rejected int; v_qualified int;
  v_current public.p2a_vcr_prerequisite_status;
  v_target  public.p2a_vcr_prerequisite_status;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  v_prereq_id := COALESCE(NEW.prerequisite_id, OLD.prerequisite_id);
  IF v_prereq_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT status INTO v_current FROM public.p2a_vcr_prerequisites WHERE id=v_prereq_id;
  -- Advance-only guard: terminal prereq statuses are historical and MUST NOT be
  -- regressed or churned by later ledger writes. Decisions arriving on a
  -- terminal prereq are recorded on the ledger row for audit but do not
  -- recompute the prereq rollup.
  IF v_current IN ('ACCEPTED','REJECTED','QUALIFICATION_APPROVED','NA') THEN RETURN NEW; END IF;

  WITH per_role AS (
    SELECT approver_role_id,
      bool_or(status='REJECTED')  AS has_rej,
      bool_or(status='QUALIFIED') AS has_qual,
      bool_or(status='ACCEPTED')  AS has_acc,
      bool_or(status='PENDING')   AS has_pend
    FROM public.vcr_prerequisite_approvals
    WHERE prerequisite_id = v_prereq_id
    GROUP BY approver_role_id
  )
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE has_acc AND NOT has_pend AND NOT has_rej AND NOT has_qual),
         COUNT(*) FILTER (WHERE has_rej),
         COUNT(*) FILTER (WHERE has_qual)
  INTO v_total, v_accepted, v_rejected, v_qualified
  FROM per_role;

  IF v_total = 0 THEN RETURN NEW; END IF;

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
           reviewed_at = CASE WHEN v_target IN ('ACCEPTED','REJECTED') THEN now() ELSE reviewed_at END,
           updated_at = now()
     WHERE id = v_prereq_id;
  END IF;
  RETURN NEW;
END
$function$;