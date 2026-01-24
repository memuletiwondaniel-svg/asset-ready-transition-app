-- =====================================================
-- P2A HANDOVER WORKSPACE - COMPLETE DATABASE SCHEMA
-- =====================================================

-- Create enums for status tracking
CREATE TYPE p2a_plan_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE p2a_system_completion_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'RFO', 'RFSU');
CREATE TYPE p2a_system_source_type AS ENUM ('MANUAL', 'EXCEL_IMPORT', 'API_GOCOMPLETIONS', 'API_HUB2');
CREATE TYPE p2a_milestone_source AS ENUM ('MANUAL', 'PRIMAVERA_API');
CREATE TYPE p2a_handover_point_status AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'SIGNED');
CREATE TYPE p2a_vcr_prerequisite_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'ACCEPTED', 'REJECTED', 'QUALIFICATION_REQUESTED', 'QUALIFICATION_APPROVED');
CREATE TYPE p2a_qualification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE p2a_subsystem_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- =====================================================
-- 1. P2A HANDOVER PLANS - Main workspace container
-- =====================================================
CREATE TABLE public.p2a_handover_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ora_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status p2a_plan_status NOT NULL DEFAULT 'DRAFT',
  project_code TEXT, -- e.g., DP300
  plant_code TEXT, -- e.g., N003
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_handover_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all handover plans" 
ON public.p2a_handover_plans FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create handover plans" 
ON public.p2a_handover_plans FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update handover plans" 
ON public.p2a_handover_plans FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete handover plans" 
ON public.p2a_handover_plans FOR DELETE 
USING (auth.uid() = created_by);

-- =====================================================
-- 2. P2A SYSTEMS - Systems registry
-- =====================================================
CREATE TABLE public.p2a_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_plan_id UUID NOT NULL REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE,
  system_id TEXT NOT NULL, -- e.g., N003-DP300-100
  name TEXT NOT NULL, -- e.g., Instrument Air System
  is_hydrocarbon BOOLEAN NOT NULL DEFAULT false,
  completion_status p2a_system_completion_status NOT NULL DEFAULT 'NOT_STARTED',
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  target_rfo_date DATE,
  target_rfsu_date DATE,
  actual_rfo_date DATE,
  actual_rfsu_date DATE,
  source_type p2a_system_source_type NOT NULL DEFAULT 'MANUAL',
  external_id TEXT, -- ID from external system
  punchlist_a_count INTEGER NOT NULL DEFAULT 0,
  punchlist_b_count INTEGER NOT NULL DEFAULT 0,
  itr_a_count INTEGER NOT NULL DEFAULT 0,
  itr_b_count INTEGER NOT NULL DEFAULT 0,
  itr_total_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all systems" 
ON public.p2a_systems FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create systems" 
ON public.p2a_systems FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update systems" 
ON public.p2a_systems FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete systems" 
ON public.p2a_systems FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 3. P2A SUBSYSTEMS - Subsystems under each system
-- =====================================================
CREATE TABLE public.p2a_subsystems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  subsystem_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mc_status p2a_subsystem_status NOT NULL DEFAULT 'NOT_STARTED',
  pcc_status p2a_subsystem_status NOT NULL DEFAULT 'NOT_STARTED',
  comm_status p2a_subsystem_status NOT NULL DEFAULT 'NOT_STARTED',
  punchlist_a_count INTEGER NOT NULL DEFAULT 0,
  punchlist_b_count INTEGER NOT NULL DEFAULT 0,
  itr_count INTEGER NOT NULL DEFAULT 0,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_subsystems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all subsystems" 
ON public.p2a_subsystems FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage subsystems" 
ON public.p2a_subsystems FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. P2A PROJECT MILESTONES - Key project milestones
-- =====================================================
CREATE TABLE public.p2a_project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_plan_id UUID NOT NULL REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., Project MC, RFSU, 1st Gas
  code TEXT, -- Short code for display
  target_date DATE,
  actual_date DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  source p2a_milestone_source NOT NULL DEFAULT 'MANUAL',
  external_id TEXT, -- Primavera activity ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all milestones" 
ON public.p2a_project_milestones FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage milestones" 
ON public.p2a_project_milestones FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 5. P2A PROJECT PHASES - Phases between milestones
-- =====================================================
CREATE TABLE public.p2a_project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_plan_id UUID NOT NULL REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "MC to RFSU"
  description TEXT, -- Why this phase matters
  start_milestone_id UUID REFERENCES public.p2a_project_milestones(id) ON DELETE SET NULL,
  end_milestone_id UUID REFERENCES public.p2a_project_milestones(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3B82F6', -- Visual color code
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all phases" 
ON public.p2a_project_phases FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage phases" 
ON public.p2a_project_phases FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 6. P2A HANDOVER POINTS - VCR (Verification of Readiness) points
-- =====================================================
CREATE TABLE public.p2a_handover_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.p2a_project_phases(id) ON DELETE CASCADE,
  vcr_code TEXT NOT NULL, -- Auto-generated: VCR-DP300-001
  name TEXT NOT NULL, -- e.g., Critical Utilities Batch 1
  description TEXT, -- Why this grouping exists
  status p2a_handover_point_status NOT NULL DEFAULT 'PENDING',
  position_x INTEGER NOT NULL DEFAULT 0, -- Horizontal position within phase
  position_y INTEGER NOT NULL DEFAULT 0, -- Vertical position in phase
  target_date DATE,
  completion_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_handover_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all handover points" 
ON public.p2a_handover_points FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage handover points" 
ON public.p2a_handover_points FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 7. P2A HANDOVER POINT SYSTEMS - Junction: systems to VCR
-- =====================================================
CREATE TABLE public.p2a_handover_point_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(handover_point_id, system_id)
);

-- Enable RLS
ALTER TABLE public.p2a_handover_point_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all handover point systems" 
ON public.p2a_handover_point_systems FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage handover point systems" 
ON public.p2a_handover_point_systems FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 8. P2A VCR PREREQUISITES - Prerequisites per VCR
-- =====================================================
CREATE TABLE public.p2a_vcr_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  pac_prerequisite_id UUID REFERENCES public.pac_prerequisites(id), -- Template reference
  summary TEXT NOT NULL,
  description TEXT,
  status p2a_vcr_prerequisite_status NOT NULL DEFAULT 'NOT_STARTED',
  delivering_party_id UUID REFERENCES auth.users(id),
  delivering_party_name TEXT,
  receiving_party_id UUID REFERENCES auth.users(id),
  receiving_party_name TEXT,
  evidence_links JSONB DEFAULT '[]', -- Array of evidence URLs
  comments TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all VCR prerequisites" 
ON public.p2a_vcr_prerequisites FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage VCR prerequisites" 
ON public.p2a_vcr_prerequisites FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 9. P2A VCR QUALIFICATIONS - Deviation/Qualification requests
-- =====================================================
CREATE TABLE public.p2a_vcr_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vcr_prerequisite_id UUID NOT NULL REFERENCES public.p2a_vcr_prerequisites(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- Why it cannot be completed
  mitigation TEXT NOT NULL, -- Proposed mitigation
  follow_up_action TEXT,
  target_date DATE NOT NULL, -- Target completion
  action_owner_id UUID REFERENCES auth.users(id),
  action_owner_name TEXT,
  status p2a_qualification_status NOT NULL DEFAULT 'PENDING',
  reviewer_comments TEXT, -- Receiving party feedback
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all VCR qualifications" 
ON public.p2a_vcr_qualifications FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage VCR qualifications" 
ON public.p2a_vcr_qualifications FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 10. P2A VCR EVIDENCE - File attachments for prerequisites
-- =====================================================
CREATE TABLE public.p2a_vcr_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vcr_prerequisite_id UUID NOT NULL REFERENCES public.p2a_vcr_prerequisites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all VCR evidence" 
ON public.p2a_vcr_evidence FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage VCR evidence" 
ON public.p2a_vcr_evidence FOR ALL 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_p2a_handover_plans_ora_plan ON public.p2a_handover_plans(ora_plan_id);
CREATE INDEX idx_p2a_systems_handover_plan ON public.p2a_systems(handover_plan_id);
CREATE INDEX idx_p2a_systems_completion ON public.p2a_systems(completion_status);
CREATE INDEX idx_p2a_subsystems_system ON public.p2a_subsystems(system_id);
CREATE INDEX idx_p2a_milestones_handover_plan ON public.p2a_project_milestones(handover_plan_id);
CREATE INDEX idx_p2a_phases_handover_plan ON public.p2a_project_phases(handover_plan_id);
CREATE INDEX idx_p2a_handover_points_phase ON public.p2a_handover_points(phase_id);
CREATE INDEX idx_p2a_handover_point_systems_point ON public.p2a_handover_point_systems(handover_point_id);
CREATE INDEX idx_p2a_handover_point_systems_system ON public.p2a_handover_point_systems(system_id);
CREATE INDEX idx_p2a_vcr_prerequisites_point ON public.p2a_vcr_prerequisites(handover_point_id);
CREATE INDEX idx_p2a_vcr_qualifications_prereq ON public.p2a_vcr_qualifications(vcr_prerequisite_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_p2a_handover_plans_updated_at
BEFORE UPDATE ON public.p2a_handover_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_systems_updated_at
BEFORE UPDATE ON public.p2a_systems
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_subsystems_updated_at
BEFORE UPDATE ON public.p2a_subsystems
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_milestones_updated_at
BEFORE UPDATE ON public.p2a_project_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_phases_updated_at
BEFORE UPDATE ON public.p2a_project_phases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_handover_points_updated_at
BEFORE UPDATE ON public.p2a_handover_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_vcr_prerequisites_updated_at
BEFORE UPDATE ON public.p2a_vcr_prerequisites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_vcr_qualifications_updated_at
BEFORE UPDATE ON public.p2a_vcr_qualifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION to generate VCR code
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_vcr_code(project_code TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  vcr_code TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN hp.vcr_code ~ ('^VCR-' || project_code || '-[0-9]+$')
      THEN CAST(SUBSTRING(hp.vcr_code FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.p2a_handover_points hp
  JOIN public.p2a_project_phases ph ON hp.phase_id = ph.id
  JOIN public.p2a_handover_plans pl ON ph.handover_plan_id = pl.id
  WHERE pl.project_code = project_code;
  
  vcr_code := 'VCR-' || project_code || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN vcr_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;