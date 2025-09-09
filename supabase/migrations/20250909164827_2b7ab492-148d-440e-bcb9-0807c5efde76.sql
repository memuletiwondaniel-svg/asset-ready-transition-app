-- Create PSSRs table to store PSSR data
CREATE TABLE public.pssrs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  asset TEXT NOT NULL,
  reason TEXT NOT NULL,
  project_id TEXT,
  project_name TEXT,
  scope TEXT,
  plant TEXT,
  cs_location TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  approval_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalized_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create PSSR links table for linking PSSRs as prerequisites
CREATE TABLE public.pssr_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  linked_pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(parent_pssr_id, linked_pssr_id)
);

-- Create PSSR checklist responses table
CREATE TABLE public.pssr_checklist_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id TEXT NOT NULL,
  response TEXT CHECK (response IN ('YES', 'NO', 'N/A')),
  narrative TEXT,
  deviation_reason TEXT,
  potential_risk TEXT,
  mitigations TEXT,
  follow_up_action TEXT,
  action_owner TEXT,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_SUBMITTED' CHECK (status IN ('NOT_SUBMITTED', 'UNDER_REVIEW', 'APPROVED')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pssr_id, checklist_item_id)
);

-- Create PSSR approvers table
CREATE TABLE public.pssr_approvers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  approver_name TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  approver_level INTEGER NOT NULL CHECK (approver_level IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PSSR team members table
CREATE TABLE public.pssr_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  member_role TEXT NOT NULL,
  member_type TEXT NOT NULL CHECK (member_type IN ('TECHNICAL_AUTHORITY', 'ASSET_TEAM', 'PROJECT_TEAM', 'HSSE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pssrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for PSSRs
CREATE POLICY "Users can view their own PSSRs" 
ON public.pssrs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PSSRs" 
ON public.pssrs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PSSRs" 
ON public.pssrs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PSSRs" 
ON public.pssrs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for PSSR links
CREATE POLICY "Users can view PSSR links for their PSSRs" 
ON public.pssr_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE (pssrs.id = pssr_links.parent_pssr_id OR pssrs.id = pssr_links.linked_pssr_id) 
    AND pssrs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create PSSR links for their PSSRs" 
ON public.pssr_links 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = pssr_links.parent_pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete PSSR links for their PSSRs" 
ON public.pssr_links 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = pssr_links.parent_pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create RLS policies for checklist responses
CREATE POLICY "Users can manage checklist responses for their PSSRs" 
ON public.pssr_checklist_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = pssr_checklist_responses.pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create RLS policies for approvers
CREATE POLICY "Users can manage approvers for their PSSRs" 
ON public.pssr_approvers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = pssr_approvers.pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create RLS policies for team members
CREATE POLICY "Users can manage team members for their PSSRs" 
ON public.pssr_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = pssr_team_members.pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pssrs_updated_at
  BEFORE UPDATE ON public.pssrs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_checklist_responses_updated_at
  BEFORE UPDATE ON public.pssr_checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_pssrs_user_id ON public.pssrs(user_id);
CREATE INDEX idx_pssrs_status ON public.pssrs(status);
CREATE INDEX idx_pssr_links_parent ON public.pssr_links(parent_pssr_id);
CREATE INDEX idx_pssr_links_linked ON public.pssr_links(linked_pssr_id);
CREATE INDEX idx_checklist_responses_pssr ON public.pssr_checklist_responses(pssr_id);
CREATE INDEX idx_approvers_pssr ON public.pssr_approvers(pssr_id);
CREATE INDEX idx_team_members_pssr ON public.pssr_team_members(pssr_id);