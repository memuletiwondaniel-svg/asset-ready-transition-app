-- Mark existing auto-completed VCR template tasks
-- These are the Hydrocarbon and Non-Hydrocarbon tasks that were completed by Roaa's approval
-- but assigned to other users (Daniel in this case)
UPDATE public.user_tasks
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"auto_completed": true}'::jsonb
WHERE status = 'completed'
  AND type = 'review'
  AND title LIKE '%VCR Template%'
  AND (title LIKE '%Hydrocarbon Systems%' OR title LIKE '%Non-Hydrocarbon Systems%')
  AND user_id != (
    SELECT user_id FROM public.user_tasks 
    WHERE status = 'completed' 
      AND type = 'review' 
      AND title LIKE '%VCR Template: Pipelines%'
    LIMIT 1
  );