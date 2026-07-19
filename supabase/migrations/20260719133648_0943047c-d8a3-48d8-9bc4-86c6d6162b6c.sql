
UPDATE public.qaqc_checks
SET sql = $CHECK$
SELECT p.id AS prerequisite_id, p.summary, p.reviewed_at
FROM public.p2a_vcr_prerequisites p
WHERE p.status::text NOT IN ('ACCEPTED','QUALIFICATION_APPROVED')
  AND EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals a WHERE a.prerequisite_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_prerequisite_approvals a
    WHERE a.prerequisite_id = p.id AND a.status::text <> 'ACCEPTED'
  )
$CHECK$
WHERE id = 'L3';
