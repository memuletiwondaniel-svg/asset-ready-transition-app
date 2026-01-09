-- Create ora_plan_templates table for reusable ORA templates
CREATE TABLE public.ora_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL, -- e.g., 'Greenfield', 'Brownfield', 'Modification', 'Tie-in'
  complexity TEXT NOT NULL DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
  applicable_phases TEXT[] NOT NULL DEFAULT ARRAY['SELECT', 'DEFINE', 'EXECUTE'],
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ora_template_activities junction table to link templates with activities
CREATE TABLE public.ora_template_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ora_plan_templates(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.ora_activity_catalog(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  custom_estimated_hours INTEGER,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, activity_id)
);

-- Create indexes
CREATE INDEX idx_ora_plan_templates_project_type ON public.ora_plan_templates(project_type);
CREATE INDEX idx_ora_plan_templates_complexity ON public.ora_plan_templates(complexity);
CREATE INDEX idx_ora_plan_templates_is_active ON public.ora_plan_templates(is_active);
CREATE INDEX idx_ora_template_activities_template_id ON public.ora_template_activities(template_id);
CREATE INDEX idx_ora_template_activities_activity_id ON public.ora_template_activities(activity_id);

-- Enable RLS
ALTER TABLE public.ora_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_template_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for ora_plan_templates
CREATE POLICY "Authenticated users can view ora_plan_templates"
ON public.ora_plan_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ora_plan_templates"
ON public.ora_plan_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ora_plan_templates"
ON public.ora_plan_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete ora_plan_templates"
ON public.ora_plan_templates FOR DELETE TO authenticated USING (true);

-- RLS policies for ora_template_activities
CREATE POLICY "Authenticated users can view ora_template_activities"
ON public.ora_template_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ora_template_activities"
ON public.ora_template_activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ora_template_activities"
ON public.ora_template_activities FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete ora_template_activities"
ON public.ora_template_activities FOR DELETE TO authenticated USING (true);

-- Create updated_at trigger for templates
CREATE TRIGGER update_ora_plan_templates_updated_at
BEFORE UPDATE ON public.ora_plan_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample templates
INSERT INTO public.ora_plan_templates (name, description, project_type, complexity, applicable_phases, is_default)
VALUES
  ('Standard Greenfield Project', 'Full ORA template for new greenfield installations', 'Greenfield', 'high', ARRAY['IDENTIFY', 'ASSESS', 'SELECT', 'DEFINE', 'EXECUTE', 'OPERATE'], true),
  ('Brownfield Modification', 'Template for modifications to existing facilities', 'Brownfield', 'medium', ARRAY['ASSESS', 'SELECT', 'DEFINE', 'EXECUTE'], false),
  ('Simple Tie-in Project', 'Streamlined template for tie-in projects', 'Tie-in', 'low', ARRAY['SELECT', 'DEFINE', 'EXECUTE'], false),
  ('Complex Expansion', 'Comprehensive template for major facility expansions', 'Expansion', 'high', ARRAY['IDENTIFY', 'ASSESS', 'SELECT', 'DEFINE', 'EXECUTE', 'OPERATE'], false);