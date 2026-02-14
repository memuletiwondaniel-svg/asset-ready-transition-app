-- Create BFM Lead role
INSERT INTO public.roles (name, is_active)
VALUES ('BFM Lead', true)
ON CONFLICT DO NOTHING;

-- Add BFM Lead, Ops Manager, and Ops Team Lead to pssr_allowed_approver_roles
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles WHERE name IN ('BFM Lead', 'Ops Manager', 'Ops Team Lead')
AND id NOT IN (SELECT role_id FROM public.pssr_allowed_approver_roles);