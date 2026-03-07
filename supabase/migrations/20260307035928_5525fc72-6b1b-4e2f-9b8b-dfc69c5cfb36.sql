
-- Grant access_admin permission to ORA Lead (Daniel & Roaa) and P&M Director (Paul)
INSERT INTO public.role_permissions (role_id, permission)
VALUES 
  ('11d4cc74-146e-48d5-9a98-922dbf8c08f0', 'access_admin'),
  ('62c2424d-6ce8-40d6-9979-5b7222efff50', 'access_admin')
ON CONFLICT DO NOTHING;
