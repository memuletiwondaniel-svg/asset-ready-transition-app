
-- Step 1: Fix the check constraint to allow bundle types
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check CHECK (type = ANY (ARRAY['approval', 'task', 'update', 'review', 'vcr_checklist_bundle', 'vcr_approval_bundle', 'pssr_checklist_bundle', 'pssr_approval_bundle']));
