-- Create P2A handover phases enum
CREATE TYPE public.p2a_phase AS ENUM ('PAC', 'FAC');

-- Create P2A handover status enum
CREATE TYPE public.p2a_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Create P2A deliverable status enum
CREATE TYPE public.p2a_deliverable_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BEHIND_SCHEDULE', 'COMPLETED', 'NOT_APPLICABLE');

-- Create P2A handovers table
CREATE TABLE public.p2a_handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase public.p2a_phase NOT NULL,
  status public.p2a_status NOT NULL DEFAULT 'DRAFT',
  handover_scope TEXT,
  pssr_signed_date DATE,
  pac_effective_date DATE,
  fac_effective_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create P2A deliverable categories table
CREATE TABLE public.p2a_deliverable_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create P2A handover deliverables table
CREATE TABLE public.p2a_handover_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.p2a_deliverable_categories(id),
  deliverable_name TEXT NOT NULL,
  delivering_party TEXT NOT NULL,
  receiving_party TEXT NOT NULL,
  status public.p2a_deliverable_status NOT NULL DEFAULT 'NOT_STARTED',
  completion_date DATE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default deliverable categories based on heatmap
INSERT INTO public.p2a_deliverable_categories (name, description, display_order) VALUES
('Construction & Commissioning', 'Construction completion and commissioning status', 1),
('Resourcing', 'Resource allocation and manning', 2),
('Training', 'Operator and maintenance training', 3),
('Documentation', 'Procedures, registers, and documentation', 4),
('SUOP', 'Safe Upper Operating Procedures', 5),
('PSSR/SoF', 'Pre-Startup Safety Review and Statement of Fitness', 6),
('Performance Test', 'Performance testing and validation', 7),
('Maintenance Readiness', 'Asset registration, PMs, spares, and CMF', 8),
('Service Contract', 'Service and maintenance contracts', 9),
('PAC', 'Provisional Acceptance Certificate', 10),
('OWL', 'Outstanding Work List', 11),
('FAC', 'Final Acceptance Certificate', 12);

-- Enable RLS
ALTER TABLE public.p2a_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2a_deliverable_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2a_handover_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for p2a_handovers
CREATE POLICY "Users can view all P2A handovers"
ON public.p2a_handovers FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create P2A handovers"
ON public.p2a_handovers FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own P2A handovers"
ON public.p2a_handovers FOR UPDATE
USING (auth.uid() = created_by OR user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete P2A handovers"
ON public.p2a_handovers FOR DELETE
USING (user_is_admin(auth.uid()));

-- RLS Policies for p2a_deliverable_categories
CREATE POLICY "All users can view deliverable categories"
ON public.p2a_deliverable_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage deliverable categories"
ON public.p2a_deliverable_categories FOR ALL
USING (user_is_admin(auth.uid()));

-- RLS Policies for p2a_handover_deliverables
CREATE POLICY "Users can view handover deliverables"
ON public.p2a_handover_deliverables FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.p2a_handovers 
  WHERE id = p2a_handover_deliverables.handover_id AND is_active = true
));

CREATE POLICY "Users can manage handover deliverables"
ON public.p2a_handover_deliverables FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.p2a_handovers 
  WHERE id = p2a_handover_deliverables.handover_id 
  AND (created_by = auth.uid() OR user_is_admin(auth.uid()))
));

-- Create trigger to update updated_at
CREATE TRIGGER update_p2a_handovers_updated_at
BEFORE UPDATE ON public.p2a_handovers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2a_handover_deliverables_updated_at
BEFORE UPDATE ON public.p2a_handover_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();