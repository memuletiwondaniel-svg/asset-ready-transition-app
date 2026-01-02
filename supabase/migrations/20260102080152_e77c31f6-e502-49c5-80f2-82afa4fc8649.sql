-- Clear existing roles and insert new ones with category assignments
DELETE FROM public.roles;

-- Insert Project roles (11 roles)
INSERT INTO public.roles (name, description, is_active, category_id)
SELECT r.role_name, r.role_desc, true, rc.id
FROM (VALUES
  ('P&E Director', 'Projects & Engineering Director'),
  ('Project Engr', 'Project Engineer'),
  ('Project Manager', 'Project Manager'),
  ('Project Hub Lead', 'Project Hub Lead'),
  ('Completions Engr', 'Completions Engineer'),
  ('Commissioning Lead', 'Commissioning Lead'),
  ('Commissioning Engr. PACO', 'Commissioning Engineer - PACO'),
  ('Commissioning Engr. MECH', 'Commissioning Engineer - Mechanical'),
  ('Commissioning Engr. ELECT', 'Commissioning Engineer - Electrical'),
  ('Construction Lead', 'Construction Lead'),
  ('Project Controls Lead', 'Project Controls Lead')
) AS r(role_name, role_desc)
CROSS JOIN public.role_category rc WHERE rc.name = 'Project';

-- Insert Engineering roles (8 roles)
INSERT INTO public.roles (name, description, is_active, category_id)
SELECT r.role_name, r.role_desc, true, rc.id
FROM (VALUES
  ('Engr. Manager', 'Engineering Manager'),
  ('Process TA2', 'Process Technical Authority Level 2'),
  ('Static TA2', 'Static Equipment Technical Authority Level 2'),
  ('Rotating TA2', 'Rotating Equipment Technical Authority Level 2'),
  ('PACO TA2', 'PACO Technical Authority Level 2'),
  ('Elect TA2', 'Electrical Technical Authority Level 2'),
  ('Civil TA2', 'Civil Technical Authority Level 2'),
  ('Tech Safety TA2', 'Technical Safety Technical Authority Level 2')
) AS r(role_name, role_desc)
CROSS JOIN public.role_category rc WHERE rc.name = 'Engineering';

-- Insert Operations roles (10 roles)
INSERT INTO public.roles (name, description, is_active, category_id)
SELECT r.role_name, r.role_desc, true, rc.id
FROM (VALUES
  ('Prod Director', 'Production Director'),
  ('Plant Director', 'Plant Director'),
  ('Dep. Plant Director', 'Deputy Plant Director'),
  ('Ops Team Lead', 'Operations Team Lead'),
  ('Ops Coach', 'Operations Coach'),
  ('Site Engr.', 'Site Engineer'),
  ('ORA Engr.', 'Operational Risk Assessment Engineer'),
  ('ORA Lead', 'Operational Risk Assessment Lead'),
  ('CMMS Lead', 'Computerized Maintenance Management System Lead'),
  ('CMMS Engr.', 'Computerized Maintenance Management System Engineer')
) AS r(role_name, role_desc)
CROSS JOIN public.role_category rc WHERE rc.name = 'Operations';

-- Insert Safety roles (9 roles)
INSERT INTO public.roles (name, description, is_active, category_id)
SELECT r.role_name, r.role_desc, true, rc.id
FROM (VALUES
  ('HSE Director', 'Health, Safety & Environment Director'),
  ('TSE Manager', 'Technical Safety Engineering Manager'),
  ('TSE Engr.', 'Technical Safety Engineer'),
  ('HSE Manager', 'Health, Safety & Environment Manager'),
  ('Ops HSE Adviser', 'Operations HSE Adviser'),
  ('Proj HSE Adviser', 'Project HSE Adviser'),
  ('ER Manager', 'Emergency Response Manager'),
  ('ER Adviser', 'Emergency Response Adviser'),
  ('Environment Engr', 'Environment Engineer')
) AS r(role_name, role_desc)
CROSS JOIN public.role_category rc WHERE rc.name = 'Safety';

-- Create function to get roles by category
CREATE OR REPLACE FUNCTION public.get_roles_by_category()
RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  category_order INTEGER,
  role_id UUID,
  role_name TEXT,
  role_description TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rc.id as category_id,
    rc.name as category_name,
    rc.display_order as category_order,
    r.id as role_id,
    r.name as role_name,
    r.description as role_description
  FROM public.role_category rc
  LEFT JOIN public.roles r ON r.category_id = rc.id AND r.is_active = true
  WHERE rc.is_active = true
  ORDER BY rc.display_order, r.name;
$$;