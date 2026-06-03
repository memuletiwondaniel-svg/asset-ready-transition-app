INSERT INTO public.org_role_holders (role_id, user_id)
SELECT r.id, '3c193139-a40f-4c25-8d76-fec567254b60'::uuid
FROM public.roles r
WHERE r.name = 'Elect TA2 - Asset'
ON CONFLICT DO NOTHING;