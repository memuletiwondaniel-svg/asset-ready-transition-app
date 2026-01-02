-- Create two new Engineering Manager roles
INSERT INTO public.roles (name, is_active)
VALUES 
  ('Engr. Manager (Asset)', true),
  ('Engr. Manager (P&E)', true)
ON CONFLICT DO NOTHING;