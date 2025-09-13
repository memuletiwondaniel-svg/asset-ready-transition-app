-- Clear existing roles and insert the new specific roles
DELETE FROM public.roles;

-- Insert the new roles
INSERT INTO public.roles (name) VALUES
  ('Director'),
  ('Plant Director'),
  ('Dep. Plant Director'),
  ('Proj Manager'),
  ('Proj Engr'),
  ('Commissioning Lead'),
  ('Construction Lead'),
  ('ORA Engineer'),
  ('Site Engineer'),
  ('Ops Coach'),
  ('Ops Team Lead'),
  ('Engr. Manager'),
  ('Tech. Authority (TA2)'),
  ('ER Lead'),
  ('HSE Lead');