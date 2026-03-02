-- Remove Process TA2 - Project from PSSR allowed approver roles
DELETE FROM public.pssr_allowed_approver_roles
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'Process TA2 - Project' LIMIT 1);

-- Add all Asset TA2 roles + Civil TA2 + Tech Safety TA2 to PSSR allowed approver roles
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles
WHERE name IN (
  'Process TA2 - Asset', 'Elect TA2 - Asset', 'Static TA2 - Asset',
  'Rotating TA2 - Asset', 'PACO TA2 - Asset', 'MCI TA2 - Asset',
  'Civil TA2', 'Tech Safety TA2'
)
ON CONFLICT DO NOTHING;