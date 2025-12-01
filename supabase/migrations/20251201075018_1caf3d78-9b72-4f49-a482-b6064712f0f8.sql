-- Update DP317 to be active
UPDATE public.projects 
SET is_active = true 
WHERE project_id_number = '317' AND project_id_prefix = 'DP';

-- Drop the old SELECT policy and create a new one that works for all users
DROP POLICY IF EXISTS "Users can view active projects" ON public.projects;

CREATE POLICY "Anyone can view active projects"
ON public.projects
FOR SELECT
USING (is_active = true);