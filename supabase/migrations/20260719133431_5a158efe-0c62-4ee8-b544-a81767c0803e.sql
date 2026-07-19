
-- STEP 4: relax L3 (item-truth-terminal) and L4 (SUPERSEDED skip when prereq ACCEPTED)
UPDATE public.qaqc_checks
SET sql = $CHECK$
SELECT p.id AS prerequisite_id, p.summary, p.reviewed_at
FROM public.p2a_vcr_prerequisites p
WHERE p.status::text NOT IN ('ACCEPTED','QUALIFICATION_APPROVED')
  AND EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals a WHERE a.prerequisite_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals a
    WHERE a.prerequisite_id = p.id AND a.status::text = 'ACCEPTED'
  )
$CHECK$
WHERE id = 'L3';

UPDATE public.qaqc_checks
SET sql = $CHECK$
SELECT s.id, s.prerequisite_id, s.approver_role_id, s.approver_user_id
FROM public.vcr_prerequisite_approvals s
JOIN public.p2a_vcr_prerequisites p ON p.id = s.prerequisite_id
WHERE s.status::text = 'SUPERSEDED'
  AND p.status::text NOT IN ('ACCEPTED','QUALIFICATION_APPROVED')
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals pr
    WHERE pr.prerequisite_id = s.prerequisite_id
      AND pr.approver_role_id = s.approver_role_id
      AND pr.id <> s.id
      AND pr.status::text IN ('ACCEPTED','REJECTED','QUALIFIED','QUALIFICATION_APPROVED')
  )
$CHECK$
WHERE id = 'L4';

-- STEP 5: add WITHDRAWN to qualification enum
ALTER TYPE public.p2a_qualification_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
