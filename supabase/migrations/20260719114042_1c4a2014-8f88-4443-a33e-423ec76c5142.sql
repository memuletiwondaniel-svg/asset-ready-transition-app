-- Reconcile VCR-DP300-02 items-are-truth invariant: any delivering role that
-- has already submitted a discipline assurance statement must have all its
-- prerequisite items in terminal status. Promote non-terminal items to their
-- terminal equivalent for such roles on this VCR only.
DO $$
DECLARE
  hp uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
BEGIN
  -- Roles that already signed a discipline statement on this VCR
  WITH signed AS (
    SELECT DISTINCT discipline_role_name AS role_name
    FROM vcr_discipline_assurance
    WHERE handover_point_id = hp AND statement_type = 'discipline'
  )
  UPDATE p2a_vcr_prerequisites p
  SET status = CASE
    WHEN p.status = 'QUALIFICATION_REQUESTED' THEN 'QUALIFICATION_APPROVED'
    WHEN p.status IN ('NOT_STARTED','IN_PROGRESS','REJECTED') THEN 'ACCEPTED'
    ELSE p.status
  END,
  updated_at = now()
  WHERE p.handover_point_id = hp
    AND p.delivering_party_name IN (SELECT role_name FROM signed)
    AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED');

  -- Sync any linked qualification records to APPROVED for the promoted rows
  UPDATE p2a_vcr_qualifications q
  SET status = 'APPROVED', reviewed_at = COALESCE(q.reviewed_at, now()), updated_at = now()
  FROM p2a_vcr_prerequisites p
  WHERE q.vcr_prerequisite_id = p.id
    AND p.handover_point_id = hp
    AND p.status = 'QUALIFICATION_APPROVED'
    AND q.status <> 'APPROVED';
END $$;