-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active projects
CREATE POLICY "Users can view active projects"
ON public.projects
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Authenticated users can create projects
CREATE POLICY "Users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own projects or if they're admin
CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR user_is_admin(auth.uid())
);

-- Policy: Users can soft-delete their own projects or if they're admin
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR user_is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = created_by 
  OR user_is_admin(auth.uid())
);