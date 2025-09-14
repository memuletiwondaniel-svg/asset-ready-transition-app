-- Update RLS policy to allow anonymous project creation
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Create new policy that allows anonymous project creation
CREATE POLICY "Anyone can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (true);

-- Update the existing policy to handle null created_by for anonymous projects
DROP POLICY IF EXISTS "Project creators can update their projects" ON public.projects;

CREATE POLICY "Project creators can update their projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = created_by OR created_by IS NULL);

-- Make created_by nullable to support anonymous projects
ALTER TABLE public.projects ALTER COLUMN created_by DROP NOT NULL;