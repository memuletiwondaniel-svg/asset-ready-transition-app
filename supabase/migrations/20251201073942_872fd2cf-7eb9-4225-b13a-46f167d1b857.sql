-- Create project_team_members table to store project team information
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user_id ON public.project_team_members(user_id);

-- Enable RLS on project_team_members
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_team_members
CREATE POLICY "Anyone can view project team members"
  ON public.project_team_members
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add team members"
  ON public.project_team_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team members and admins can update"
  ON public.project_team_members
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR user_is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_team_members.project_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Project creators and admins can delete team members"
  ON public.project_team_members
  FOR DELETE
  USING (
    user_is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_team_members.project_id 
      AND created_by = auth.uid()
    )
  );

-- Add trigger to update updated_at on projects table
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Add trigger to update updated_at on project_team_members table
DROP TRIGGER IF EXISTS trigger_update_project_team_members_updated_at ON public.project_team_members;
CREATE TRIGGER trigger_update_project_team_members_updated_at
  BEFORE UPDATE ON public.project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update updated_at on project_milestones table
DROP TRIGGER IF EXISTS trigger_update_project_milestones_updated_at ON public.project_milestones;
CREATE TRIGGER trigger_update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update updated_at on project_documents table  
DROP TRIGGER IF EXISTS trigger_update_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER trigger_update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();