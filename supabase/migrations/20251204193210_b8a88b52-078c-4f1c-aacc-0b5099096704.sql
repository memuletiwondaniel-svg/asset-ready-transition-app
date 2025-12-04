-- Create project_milestone_types table
CREATE TABLE public.project_milestone_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default milestone types
INSERT INTO public.project_milestone_types (code, name, description, display_order) VALUES
  ('MC', 'MC - Mechanical Completion', 'Mechanical Completion milestone', 1),
  ('RFO', 'RFO - Ready for Operation', 'Ready for Operation milestone', 2),
  ('RFSU', 'RFSU - Ready for Start-up', 'Ready for Start-up milestone', 3),
  ('PSSR_SOF', 'PSSR/SoF Signed Off', 'PSSR/SoF Signed Off milestone', 4),
  ('PAC', 'PAC - Provisional Acceptance Certificate', 'Provisional Acceptance Certificate milestone', 5),
  ('FAC', 'FAC - Final Acceptance Certificate', 'Final Acceptance Certificate milestone', 6);

-- Enable RLS
ALTER TABLE public.project_milestone_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view active milestone types
CREATE POLICY "All users can view active milestone types" 
  ON public.project_milestone_types FOR SELECT 
  USING (is_active = true);

-- Users can create custom milestone types
CREATE POLICY "Users can create custom milestone types" 
  ON public.project_milestone_types FOR INSERT 
  WITH CHECK (auth.uid() = created_by AND is_custom = true);

-- Admins can manage all milestone types
CREATE POLICY "Admins can manage milestone types" 
  ON public.project_milestone_types FOR ALL 
  USING (user_is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_project_milestone_types_updated_at
  BEFORE UPDATE ON public.project_milestone_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();