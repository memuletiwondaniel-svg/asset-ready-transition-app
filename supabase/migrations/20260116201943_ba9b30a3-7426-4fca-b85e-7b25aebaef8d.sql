
-- P2A Handover Prerequisites Completion Tracking
-- Track individual prerequisite completion per handover

CREATE TABLE public.p2a_handover_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  pac_prerequisite_id UUID NOT NULL REFERENCES public.pac_prerequisites(id),
  status TEXT NOT NULL DEFAULT 'NOT_COMPLETED' 
    CHECK (status IN ('NOT_COMPLETED', 'COMPLETED', 'NOT_APPLICABLE', 'DEVIATION')),
  evidence_links TEXT[],
  comments TEXT,
  receiving_party_user_id UUID REFERENCES auth.users(id),
  -- Deviation/Qualification fields (when status = 'DEVIATION')
  deviation_reason TEXT,
  mitigation TEXT,
  follow_up_action TEXT,
  target_date DATE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_p2a_handover_prereqs_handover ON public.p2a_handover_prerequisites(handover_id);
CREATE INDEX idx_p2a_handover_prereqs_pac_prereq ON public.p2a_handover_prerequisites(pac_prerequisite_id);
CREATE INDEX idx_p2a_handover_prereqs_status ON public.p2a_handover_prerequisites(status);

-- Enable RLS
ALTER TABLE public.p2a_handover_prerequisites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view handover prerequisites" ON public.p2a_handover_prerequisites
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert handover prerequisites" ON public.p2a_handover_prerequisites
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own handover prerequisites" ON public.p2a_handover_prerequisites
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- P2A Prerequisite Attachments (for file uploads)
CREATE TABLE public.p2a_prerequisite_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_prerequisite_id UUID NOT NULL REFERENCES public.p2a_handover_prerequisites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX idx_p2a_prereq_attachments_prereq ON public.p2a_prerequisite_attachments(handover_prerequisite_id);

-- Enable RLS
ALTER TABLE public.p2a_prerequisite_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments
CREATE POLICY "Users can view prerequisite attachments" ON public.p2a_prerequisite_attachments
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload attachments" ON public.p2a_prerequisite_attachments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own attachments" ON public.p2a_prerequisite_attachments
FOR DELETE USING (uploaded_by = auth.uid());

-- P2A Handover Approvers (editable approver configuration per handover)
CREATE TABLE public.p2a_handover_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_p2a_handover_approvers_handover ON public.p2a_handover_approvers(handover_id);
CREATE INDEX idx_p2a_handover_approvers_user ON public.p2a_handover_approvers(user_id);

-- Enable RLS
ALTER TABLE public.p2a_handover_approvers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view handover approvers" ON public.p2a_handover_approvers
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage approvers" ON public.p2a_handover_approvers
FOR ALL USING (auth.uid() IS NOT NULL);

-- Add template and submission tracking to p2a_handovers
ALTER TABLE public.p2a_handovers 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.pac_templates(id),
ADD COLUMN IF NOT EXISTS template_ignored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);

-- Create updated_at trigger for p2a_handover_prerequisites
CREATE TRIGGER update_p2a_handover_prerequisites_updated_at
BEFORE UPDATE ON public.p2a_handover_prerequisites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
