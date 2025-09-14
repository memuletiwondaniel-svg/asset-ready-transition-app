-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id_prefix TEXT NOT NULL CHECK (project_id_prefix IN ('DP', 'ST', 'MoC')),
  project_id_number TEXT NOT NULL,
  project_title TEXT NOT NULL,
  plant_id UUID REFERENCES public.plant(id),
  station_id UUID REFERENCES public.station(id),
  project_scope TEXT,
  project_scope_image_url TEXT,
  hub_id UUID REFERENCES public.hubs(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(project_id_prefix, project_id_number)
);

-- Create project team members table
CREATE TABLE public.project_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL,
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

-- Create project milestones table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  milestone_name TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  is_scorecard_project BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create project documents table
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('file', 'link')),
  file_path TEXT, -- for uploaded files
  link_url TEXT, -- for external links
  link_type TEXT CHECK (link_type IN ('assai', 'sharepoint', 'wrench') OR link_type IS NULL),
  file_extension TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "All users can view projects" 
ON public.projects 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators can update their projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- RLS Policies for project team members
CREATE POLICY "Users can view project team members" 
ON public.project_team_members 
FOR SELECT 
USING (true);

CREATE POLICY "Project creators and team members can manage team" 
ON public.project_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_team_members.project_id 
    AND (p.created_by = auth.uid() OR user_is_admin(auth.uid()))
  )
);

-- RLS Policies for project milestones
CREATE POLICY "Users can view project milestones" 
ON public.project_milestones 
FOR SELECT 
USING (true);

CREATE POLICY "Project creators can manage milestones" 
ON public.project_milestones 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_milestones.project_id 
    AND (p.created_by = auth.uid() OR user_is_admin(auth.uid()))
  )
);

-- RLS Policies for project documents
CREATE POLICY "Users can view project documents" 
ON public.project_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Project creators can manage documents" 
ON public.project_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_documents.project_id 
    AND (p.created_by = auth.uid() OR user_is_admin(auth.uid()))
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', false);

-- Storage policies for project documents
CREATE POLICY "Users can upload project documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view project documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-documents');

CREATE POLICY "Document uploaders can update their files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Document uploaders can delete their files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);