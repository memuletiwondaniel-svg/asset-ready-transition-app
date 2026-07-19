
-- 1) Repair offending punch rows first (so the new trigger doesn't reject clean-up work)
UPDATE public.p2a_system_punch_items
   SET cleared_at = raised_at
 WHERE cleared_at IS NOT NULL AND cleared_at < raised_at;

-- 2) Guard: cleared_at must be >= raised_at
CREATE OR REPLACE FUNCTION public.p2a_punch_guard_cleared_after_raised()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cleared_at IS NOT NULL AND NEW.raised_at IS NOT NULL AND NEW.cleared_at < NEW.raised_at THEN
    RAISE EXCEPTION 'punch %: cleared_at (%) cannot be earlier than raised_at (%)',
      NEW.ref, NEW.cleared_at, NEW.raised_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_p2a_punch_guard_cleared_after_raised ON public.p2a_system_punch_items;
CREATE TRIGGER trg_p2a_punch_guard_cleared_after_raised
  BEFORE INSERT OR UPDATE OF cleared_at, raised_at ON public.p2a_system_punch_items
  FOR EACH ROW EXECUTE FUNCTION public.p2a_punch_guard_cleared_after_raised();

-- 3) QAQC P-01-COUNTER-COMMENT-ALIGN — flag statements ahead of items (non-destructive drift check)
INSERT INTO public.qaqc_checks (id, category, title, severity, sql, is_active)
VALUES (
  'P-01-COUNTER-COMMENT-ALIGN',
  'parties',
  'P-01: discipline statement submitted while role items not all terminal',
  'warn',
  $qaqc$
    SELECT
      da.handover_point_id::text AS handover_point_id,
      hp.vcr_code                AS vcr_code,
      da.discipline_role_id::text AS role_id,
      da.discipline_role_name    AS role_name,
      count(*) FILTER (WHERE pr.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED')) AS non_terminal_items,
      count(*)                                                                       AS total_role_items
    FROM public.vcr_discipline_assurance da
    JOIN public.p2a_handover_points hp ON hp.id = da.handover_point_id
    JOIN public.p2a_vcr_prerequisites pr ON pr.handover_point_id = da.handover_point_id
    JOIN public.pac_prerequisite_receiving_parties rp
      ON rp.prerequisite_id = pr.pac_prerequisite_id
     AND rp.role_id = da.discipline_role_id
    GROUP BY da.handover_point_id, hp.vcr_code, da.discipline_role_id, da.discipline_role_name
    HAVING count(*) FILTER (WHERE pr.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED')) > 0
  $qaqc$,
  true
)
ON CONFLICT (id) DO UPDATE
  SET sql = EXCLUDED.sql,
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      severity = EXCLUDED.severity,
      is_active = true;
