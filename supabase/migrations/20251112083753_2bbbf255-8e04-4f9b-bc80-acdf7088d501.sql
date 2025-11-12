-- Create enum for ORP project phases
CREATE TYPE orp_phase AS ENUM ('ASSESS_SELECT', 'DEFINE', 'EXECUTE');

-- Create enum for ORP status
CREATE TYPE orp_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED');

-- Create enum for deliverable status
CREATE TYPE orp_deliverable_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- Create enum for approval status
CREATE TYPE orp_approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create ORP plans table
CREATE TABLE public.orp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase orp_phase NOT NULL,
  ora_engineer_id UUID NOT NULL,
  status orp_status DEFAULT 'DRAFT' NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create ORP deliverables catalog table
CREATE TABLE public.orp_deliverables_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase orp_phase NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  has_sub_options BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORP deliverable sub-options table (for items like Operational Registers, P2A, CMMS)
CREATE TABLE public.orp_deliverable_sub_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_deliverable_id UUID REFERENCES public.orp_deliverables_catalog(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORP plan deliverables (selected deliverables for each ORP)
CREATE TABLE public.orp_plan_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID REFERENCES public.orp_plans(id) ON DELETE CASCADE NOT NULL,
  deliverable_id UUID REFERENCES public.orp_deliverables_catalog(id) NOT NULL,
  estimated_manhours DECIMAL(10, 2),
  start_date DATE,
  end_date DATE,
  status orp_deliverable_status DEFAULT 'NOT_STARTED' NOT NULL,
  completion_percentage INTEGER DEFAULT 0,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORP plan deliverable sub-selections
CREATE TABLE public.orp_plan_deliverable_sub_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_deliverable_id UUID REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE NOT NULL,
  sub_option_id UUID REFERENCES public.orp_deliverable_sub_options(id) ON DELETE CASCADE NOT NULL,
  custom_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORP deliverable dependencies (predecessors/successors)
CREATE TABLE public.orp_deliverable_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE NOT NULL,
  predecessor_id UUID REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(deliverable_id, predecessor_id)
);

-- Create ORP collaborators table
CREATE TABLE public.orp_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_deliverable_id UUID REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(plan_deliverable_id, user_id)
);

-- Create ORP resources table
CREATE TABLE public.orp_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID REFERENCES public.orp_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  user_id UUID,
  role_description TEXT,
  allocation_percentage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORP approvals table
CREATE TABLE public.orp_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID REFERENCES public.orp_plans(id) ON DELETE CASCADE NOT NULL,
  approver_role TEXT NOT NULL,
  approver_user_id UUID,
  status orp_approval_status DEFAULT 'PENDING' NOT NULL,
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(orp_plan_id, approver_role)
);

-- Enable RLS on all tables
ALTER TABLE public.orp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_deliverables_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_deliverable_sub_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_plan_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_plan_deliverable_sub_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_deliverable_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orp_plans
CREATE POLICY "Users can view their own ORPs"
  ON public.orp_plans FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = ora_engineer_id OR user_is_admin(auth.uid()));

CREATE POLICY "Users can create their own ORPs"
  ON public.orp_plans FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own ORPs"
  ON public.orp_plans FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = ora_engineer_id);

CREATE POLICY "Users can delete their own ORPs"
  ON public.orp_plans FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for orp_deliverables_catalog (public read)
CREATE POLICY "Anyone can view deliverables catalog"
  ON public.orp_deliverables_catalog FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage deliverables catalog"
  ON public.orp_deliverables_catalog FOR ALL
  USING (user_is_admin(auth.uid()));

-- RLS Policies for orp_deliverable_sub_options (public read)
CREATE POLICY "Anyone can view sub-options"
  ON public.orp_deliverable_sub_options FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sub-options"
  ON public.orp_deliverable_sub_options FOR ALL
  USING (user_is_admin(auth.uid()));

-- RLS Policies for orp_plan_deliverables
CREATE POLICY "Users can view plan deliverables"
  ON public.orp_plan_deliverables FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_plan_deliverables.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
  ));

CREATE POLICY "Users can manage plan deliverables"
  ON public.orp_plan_deliverables FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_plan_deliverables.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid())
  ));

-- RLS Policies for orp_plan_deliverable_sub_selections
CREATE POLICY "Users can view sub-selections"
  ON public.orp_plan_deliverable_sub_selections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_plan_deliverable_sub_selections.plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "Users can manage sub-selections"
  ON public.orp_plan_deliverable_sub_selections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_plan_deliverable_sub_selections.plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

-- RLS Policies for orp_deliverable_dependencies
CREATE POLICY "Users can view dependencies"
  ON public.orp_deliverable_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_deliverable_dependencies.deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "Users can manage dependencies"
  ON public.orp_deliverable_dependencies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_deliverable_dependencies.deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

-- RLS Policies for orp_collaborators
CREATE POLICY "Users can view collaborators"
  ON public.orp_collaborators FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_collaborators.plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "Users can manage collaborators"
  ON public.orp_collaborators FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plan_deliverables pd
    JOIN public.orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = orp_collaborators.plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ));

-- RLS Policies for orp_resources
CREATE POLICY "Users can view resources"
  ON public.orp_resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_resources.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "Users can manage resources"
  ON public.orp_resources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_resources.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid())
  ));

-- RLS Policies for orp_approvals
CREATE POLICY "Users can view approvals"
  ON public.orp_approvals FOR SELECT
  USING (auth.uid() = approver_user_id OR EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_approvals.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "Approvers can update approvals"
  ON public.orp_approvals FOR UPDATE
  USING (auth.uid() = approver_user_id);

CREATE POLICY "ORP creators can manage approvals"
  ON public.orp_approvals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_approvals.orp_plan_id
    AND orp_plans.created_by = auth.uid()
  ));

-- Create trigger for updating updated_at
CREATE TRIGGER update_orp_plans_updated_at
  BEFORE UPDATE ON public.orp_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orp_plan_deliverables_updated_at
  BEFORE UPDATE ON public.orp_plan_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert deliverables catalog data for ASSESS & SELECT phase
INSERT INTO public.orp_deliverables_catalog (name, phase, display_order, has_sub_options) VALUES
('O&M Philosophy', 'ASSESS_SELECT', 1, false),
('Production Promise', 'ASSESS_SELECT', 2, false),
('OPEX Studies', 'ASSESS_SELECT', 3, false),
('Logistics Assessment (LIRA)', 'ASSESS_SELECT', 4, false),
('Initial Operations Assessment (IOA)', 'ASSESS_SELECT', 5, false),
('Plant & Equipment Isolation Philosophy', 'ASSESS_SELECT', 6, false),
('Operating Mode Assurance Review (OMAR)', 'ASSESS_SELECT', 7, false),
('ORA input to Concept Select Report (CSR)', 'ASSESS_SELECT', 8, false),
('ORA input to Basis for Design (BfD)', 'ASSESS_SELECT', 9, false),
('ORA input to Project Execution Strategy (PES)', 'ASSESS_SELECT', 10, false),
('ORA input to Invitation To Tender (ITT)', 'ASSESS_SELECT', 11, false),
('Integrated Technical Reviews (ITR)', 'ASSESS_SELECT', 12, false);

-- Insert deliverables catalog data for DEFINE phase
INSERT INTO public.orp_deliverables_catalog (name, phase, display_order, has_sub_options) VALUES
('Operation Readiness Management Plan (ORMP)', 'DEFINE', 1, false),
('Hazard Operability Studies (HAZOP)', 'DEFINE', 2, false),
('Design Safety Review (DSR)', 'DEFINE', 3, false),
('Reliability Availability Modelling (RAM) study', 'DEFINE', 4, false),
('Operating Mode Assurance Review (OMAR)', 'DEFINE', 5, false),
('3D Model Review', 'DEFINE', 6, false),
('Production Promise', 'DEFINE', 7, false),
('Integrated Technical Reviews (ITR)', 'DEFINE', 8, false),
('ORA input to Project Execution Plan (PEP)', 'DEFINE', 9, false);

-- Insert deliverables catalog data for EXECUTE phase
INSERT INTO public.orp_deliverables_catalog (name, phase, display_order, has_sub_options) VALUES
('Operation Readiness Management Plan (ORMP - EXECUTE)', 'EXECUTE', 1, false),
('Operating Mode Assurance Review (OMAR)', 'EXECUTE', 2, false),
('Initial & Normal Operating Procedures', 'EXECUTE', 3, false),
('Critical Documents', 'EXECUTE', 4, false),
('Training Plan', 'EXECUTE', 5, false),
('Execute Training', 'EXECUTE', 6, false),
('Organization Resourcing & Mobilization', 'EXECUTE', 7, false),
('Variable Table & Alarm Rationalization', 'EXECUTE', 8, false),
('Pre-Incident Plans', 'EXECUTE', 9, false),
('P2A Plan', 'EXECUTE', 10, false),
('Operational Registers', 'EXECUTE', 11, true),
('Service Contracts', 'EXECUTE', 12, false),
('Computerized Maintenance Management System (CMMS)', 'EXECUTE', 13, true),
('Integrity Management System (IMS)', 'EXECUTE', 14, false),
('Start-up and Ramp Up Plan', 'EXECUTE', 15, false),
('Start-Up Organization', 'EXECUTE', 16, false),
('Start-up on Paper (SUOP) Exercise', 'EXECUTE', 17, false),
('Pre Start-up Safety Reviews', 'EXECUTE', 18, false),
('Project-to-Asset Handover (P2A)', 'EXECUTE', 19, true),
('Tri-Party Walkdowns', 'EXECUTE', 20, true);

-- Insert sub-options for Operational Registers
INSERT INTO public.orp_deliverable_sub_options (parent_deliverable_id, name, display_order)
SELECT id, 'LOLC Register', 1 FROM public.orp_deliverables_catalog WHERE name = 'Operational Registers' AND phase = 'EXECUTE'
UNION ALL
SELECT id, 'Spade Register', 2 FROM public.orp_deliverables_catalog WHERE name = 'Operational Registers' AND phase = 'EXECUTE'
UNION ALL
SELECT id, 'Temporary Override Register', 3 FROM public.orp_deliverables_catalog WHERE name = 'Operational Registers' AND phase = 'EXECUTE';

-- Insert sub-options for CMMS
INSERT INTO public.orp_deliverable_sub_options (parent_deliverable_id, name, display_order)
SELECT id, 'Asset Register Build (ARB)', 1 FROM public.orp_deliverables_catalog WHERE name = 'Computerized Maintenance Management System (CMMS)' AND phase = 'EXECUTE'
UNION ALL
SELECT id, 'Bill of Materials (BoM)', 2 FROM public.orp_deliverables_catalog WHERE name = 'Computerized Maintenance Management System (CMMS)' AND phase = 'EXECUTE'
UNION ALL
SELECT id, '2Y Operating Spares', 3 FROM public.orp_deliverables_catalog WHERE name = 'Computerized Maintenance Management System (CMMS)' AND phase = 'EXECUTE';

-- Insert sub-options for P2A
INSERT INTO public.orp_deliverable_sub_options (parent_deliverable_id, name, display_order)
SELECT id, 'Provisional Handover (PAC)', 1 FROM public.orp_deliverables_catalog WHERE name = 'Project-to-Asset Handover (P2A)' AND phase = 'EXECUTE'
UNION ALL
SELECT id, 'Final Handover (FAC)', 2 FROM public.orp_deliverables_catalog WHERE name = 'Project-to-Asset Handover (P2A)' AND phase = 'EXECUTE';