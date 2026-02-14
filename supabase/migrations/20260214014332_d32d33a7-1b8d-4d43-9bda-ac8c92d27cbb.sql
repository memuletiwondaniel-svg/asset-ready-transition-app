
-- Mark VCR template review tasks as completed where another user already approved the same template
UPDATE public.user_tasks
SET status = 'completed', updated_at = now()
WHERE status = 'pending'
AND title ILIKE '%VCR Template%'
AND type = 'review'
AND (metadata->>'template_id') IN (
  SELECT metadata->>'template_id' 
  FROM public.user_tasks 
  WHERE status = 'completed' 
  AND title ILIKE '%VCR Template%'
  AND type = 'review'
);
