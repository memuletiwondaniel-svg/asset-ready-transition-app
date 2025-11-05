-- Create PSSR reasons table
CREATE TABLE public.pssr_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sub-options table for "Restart following plant changes or modifications"
CREATE TABLE public.pssr_reason_sub_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_reason_id uuid NOT NULL REFERENCES public.pssr_reasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tie-in scopes table (for "Project Advanced Tie-in Scope")
CREATE TABLE public.pssr_tie_in_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  description text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create MOC scopes table (for "Implementation of an approved Asset MOC")
CREATE TABLE public.pssr_moc_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pssr_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_reason_sub_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_tie_in_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_moc_scopes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All users can view active records
CREATE POLICY "All users can view active PSSR reasons"
  ON public.pssr_reasons FOR SELECT
  USING (is_active = true);

CREATE POLICY "All users can view active PSSR reason sub-options"
  ON public.pssr_reason_sub_options FOR SELECT
  USING (is_active = true);

CREATE POLICY "All users can view active tie-in scopes"
  ON public.pssr_tie_in_scopes FOR SELECT
  USING (is_active = true);

CREATE POLICY "All users can view active MOC scopes"
  ON public.pssr_moc_scopes FOR SELECT
  USING (is_active = true);

-- Admin policies for management
CREATE POLICY "Admin users can manage PSSR reasons"
  ON public.pssr_reasons FOR ALL
  USING (user_is_admin(auth.uid()));

CREATE POLICY "Admin users can manage PSSR reason sub-options"
  ON public.pssr_reason_sub_options FOR ALL
  USING (user_is_admin(auth.uid()));

CREATE POLICY "Admin users can manage tie-in scopes"
  ON public.pssr_tie_in_scopes FOR ALL
  USING (user_is_admin(auth.uid()));

CREATE POLICY "Admin users can manage MOC scopes"
  ON public.pssr_moc_scopes FOR ALL
  USING (user_is_admin(auth.uid()));

-- Insert PSSR reasons
INSERT INTO public.pssr_reasons (name, display_order) VALUES
  ('Start-Up or Commissioning of a new Facility or Project', 1),
  ('Restart following a Turn Around (TAR) Event', 2),
  ('Restart following plant changes or modifications', 3),
  ('Restart following a Process Safety Incidence', 4);

-- Get the ID for "Restart following plant changes or modifications"
DO $$
DECLARE
  plant_changes_id uuid;
BEGIN
  SELECT id INTO plant_changes_id
  FROM public.pssr_reasons
  WHERE name = 'Restart following plant changes or modifications';

  -- Insert sub-options
  INSERT INTO public.pssr_reason_sub_options (parent_reason_id, name, display_order) VALUES
    (plant_changes_id, 'Project Advanced Tie-in scope', 1),
    (plant_changes_id, 'Implementation of an approved Asset MOC', 2);
END $$;

-- Insert tie-in scopes
INSERT INTO public.pssr_tie_in_scopes (code, description, display_order) VALUES
  ('MECH', 'Modification of existing piping or new piping and double block and bleed valves. Replacement of relief valves', 1),
  ('PACO', 'Modification or implementation of new safeguarding logic, graphics update, configuration and installation of new controllers and system cabinets or installation of new instruments or control systems', 2),
  ('ELECT', 'Installation of new Electrical hardware (Switchgear, UPS, Breakers) and configuration e.g. Protection Relay settings', 3),
  ('PROCESS', 'Advanced Tie-ins with modification to Process operating conditions and parameters (flow, pressure, temperature)', 4);

-- Insert MOC scopes
INSERT INTO public.pssr_moc_scopes (name, display_order) VALUES
  ('Software or Control System Upgrade', 1),
  ('Change in Process Conditions and operating parameters', 2),
  ('New or modified equipment', 3);

-- Create triggers for updated_at
CREATE TRIGGER update_pssr_reasons_updated_at
  BEFORE UPDATE ON public.pssr_reasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_reason_sub_options_updated_at
  BEFORE UPDATE ON public.pssr_reason_sub_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_tie_in_scopes_updated_at
  BEFORE UPDATE ON public.pssr_tie_in_scopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_moc_scopes_updated_at
  BEFORE UPDATE ON public.pssr_moc_scopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();