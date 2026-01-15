-- Handover Certificate Templates (for PAC, FAC, SoF)
CREATE TABLE public.handover_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('PAC', 'FAC', 'SOF')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (certificate_type, name)
);

-- PAC Prerequisite Categories (Operational CONTROL, CARE)
CREATE TABLE public.pac_prerequisite_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the two categories
INSERT INTO public.pac_prerequisite_categories (name, display_name, description, display_order)
VALUES 
  ('OPERATIONAL_CONTROL', 'Handover of Operational CONTROL', 'Prerequisites for handover of operational control from project to asset team', 1),
  ('CARE', 'Handover of CARE', 'Prerequisites for handover of care, custody and maintenance responsibilities', 2);

-- PAC Prerequisites (VCR-01)
CREATE TABLE public.pac_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.pac_prerequisite_categories(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  description TEXT,
  sample_evidence TEXT,
  delivering_party_role_id UUID REFERENCES public.roles(id),
  receiving_party_role_id UUID REFERENCES public.roles(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAC Prerequisites (VCR-02)
CREATE TABLE public.fac_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary TEXT NOT NULL,
  description TEXT,
  sample_evidence TEXT,
  delivering_party_role_id UUID REFERENCES public.roles(id),
  receiving_party_role_id UUID REFERENCES public.roles(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PAC Templates for different project scopes
CREATE TABLE public.pac_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  prerequisite_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Outstanding Work List (OWL) for integrated tracking
CREATE TABLE public.outstanding_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('PUNCHLIST', 'PSSR', 'PAC', 'FAC')),
  source_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER CHECK (priority IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED')),
  action_party_role_id UUID REFERENCES public.roles(id),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_date DATE,
  comments TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_pac_prerequisites_category ON public.pac_prerequisites(category_id);
CREATE INDEX idx_outstanding_work_items_project ON public.outstanding_work_items(project_id);
CREATE INDEX idx_outstanding_work_items_status ON public.outstanding_work_items(status);
CREATE INDEX idx_outstanding_work_items_source ON public.outstanding_work_items(source);

-- Enable RLS
ALTER TABLE public.handover_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_prerequisite_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fac_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outstanding_work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for handover_certificate_templates
CREATE POLICY "Authenticated users can view certificate templates"
ON public.handover_certificate_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage certificate templates"
ON public.handover_certificate_templates FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for pac_prerequisite_categories
CREATE POLICY "Authenticated users can view PAC categories"
ON public.pac_prerequisite_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage PAC categories"
ON public.pac_prerequisite_categories FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for pac_prerequisites
CREATE POLICY "Authenticated users can view PAC prerequisites"
ON public.pac_prerequisites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage PAC prerequisites"
ON public.pac_prerequisites FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for fac_prerequisites
CREATE POLICY "Authenticated users can view FAC prerequisites"
ON public.fac_prerequisites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage FAC prerequisites"
ON public.fac_prerequisites FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for pac_templates
CREATE POLICY "Authenticated users can view PAC templates"
ON public.pac_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage PAC templates"
ON public.pac_templates FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for outstanding_work_items
CREATE POLICY "Authenticated users can view OWL items"
ON public.outstanding_work_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert OWL items"
ON public.outstanding_work_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update OWL items"
ON public.outstanding_work_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete OWL items"
ON public.outstanding_work_items FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_handover_certificate_templates_updated_at
BEFORE UPDATE ON public.handover_certificate_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pac_prerequisites_updated_at
BEFORE UPDATE ON public.pac_prerequisites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fac_prerequisites_updated_at
BEFORE UPDATE ON public.fac_prerequisites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pac_templates_updated_at
BEFORE UPDATE ON public.pac_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outstanding_work_items_updated_at
BEFORE UPDATE ON public.outstanding_work_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate OWL item number
CREATE OR REPLACE FUNCTION public.generate_owl_item_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_number FROM 'OWL-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.outstanding_work_items
  WHERE item_number LIKE 'OWL-' || year_part || '-%';
  
  NEW.item_number := 'OWL-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_owl_number_trigger
BEFORE INSERT ON public.outstanding_work_items
FOR EACH ROW
WHEN (NEW.item_number IS NULL OR NEW.item_number = '')
EXECUTE FUNCTION public.generate_owl_item_number();

-- Insert default certificate templates
INSERT INTO public.handover_certificate_templates (certificate_type, name, content, is_default)
VALUES 
  ('PAC', 'Standard PAC Certificate', 'PROVISIONAL ACCEPTANCE CERTIFICATE (PAC)

This Provisional Acceptance Certificate confirms that the following facility/system has been provisionally accepted for operation:

Project: [PROJECT_NAME]
Facility/System: [FACILITY_NAME]
Date of PAC: [PAC_DATE]

The facility has been reviewed and the following has been confirmed:
1. All safety critical systems are operational
2. Operations personnel have been trained
3. Operating procedures are in place
4. Punch list items have been categorized and a close-out plan is agreed

This PAC is subject to the completion of outstanding items as documented in the Outstanding Work List (OWL).

Signed:
Project Director: _________________ Date: _________
Operations Director: _________________ Date: _________
HSE Director: _________________ Date: _________', true),

  ('FAC', 'Standard FAC Certificate', 'FINAL ACCEPTANCE CERTIFICATE (FAC)

This Final Acceptance Certificate confirms that the following facility/system has been finally accepted and all handover activities are complete:

Project: [PROJECT_NAME]
Facility/System: [FACILITY_NAME]
Date of FAC: [FAC_DATE]

The following has been confirmed:
1. All PAC punch list items have been closed
2. All documentation has been handed over
3. Warranty period responsibilities are transferred
4. All training has been completed
5. Spare parts are in place

The facility is now under the full care, custody and control of the receiving party.

Signed:
Project Director: _________________ Date: _________
Operations Director: _________________ Date: _________
Asset Manager: _________________ Date: _________', true),

  ('SOF', 'Standard SOF Certificate', 'STATEMENT OF FITNESS (SoF)

This Statement of Fitness certifies that the facility/equipment described below is fit for its intended purpose and safe to operate:

Project: [PROJECT_NAME]
Facility/Equipment: [FACILITY_NAME]
PSSR Number: [PSSR_NUMBER]

Based on the Pre-Startup Safety Review, it is confirmed that:
1. All safety systems are functional and tested
2. Operating procedures are approved and in place
3. Personnel are trained and competent
4. Emergency response plans are established
5. All regulatory requirements are met

This facility is certified as FIT FOR OPERATION.

Approvals:
Plant Director: _________________ Date: _________
HSE Director: _________________ Date: _________
P&M Director: _________________ Date: _________', true);