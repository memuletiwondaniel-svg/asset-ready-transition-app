INSERT INTO public.role_permissions (role_id, permission)
VALUES ('c98aedd9-db4c-4322-b15e-824c86744acc', 'access_admin')
ON CONFLICT (role_id, permission) DO NOTHING;