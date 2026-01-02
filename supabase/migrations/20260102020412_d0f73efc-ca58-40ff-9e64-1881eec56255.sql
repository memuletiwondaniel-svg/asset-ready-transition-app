-- Add Roaa Abdullah as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('0c8134fd-7bde-491c-be5a-96b3a63c048c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;