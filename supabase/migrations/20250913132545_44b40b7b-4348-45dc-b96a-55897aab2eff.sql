-- Clear existing roles and insert the new specific roles
DELETE FROM public.roles;

-- Insert the new roles
INSERT INTO public.roles (name) VALUES
  ('HSE Director'),
  ('P&E Director'),
  ('Prod. Director'),
  ('Proj Manager'),
  ('Commissioning Lead'),
  ('Construction Lead'),
  ('Deputy Plant Director'),
  ('Plant Director'),
  ('Site Engineer'),
  ('ORA Engineer'),
  ('Engr. Manager'),
  ('Tech. Authority (TA2)'),
  ('Ops Coach'),
  ('Proj Engr'),
  ('ER Lead'),
  ('OPS HSE Lead'),
  ('Proj HSE Lead');