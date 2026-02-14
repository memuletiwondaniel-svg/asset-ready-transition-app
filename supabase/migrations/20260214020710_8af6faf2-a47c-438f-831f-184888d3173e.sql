-- Fix templates that have all approvers approved but status still under_review
UPDATE public.vcr_templates t
SET status = 'approved'
WHERE t.status = 'under_review'
  AND NOT EXISTS (
    SELECT 1 FROM public.vcr_template_approvers ta
    WHERE ta.template_id = t.id
      AND (ta.approval_status IS NULL OR ta.approval_status != 'approved')
  )
  AND EXISTS (
    SELECT 1 FROM public.vcr_template_approvers ta
    WHERE ta.template_id = t.id
  );