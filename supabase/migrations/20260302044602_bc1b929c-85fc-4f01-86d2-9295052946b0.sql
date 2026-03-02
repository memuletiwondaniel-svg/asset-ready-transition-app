
-- Remove all Asset TA2 roles from PSSR allowed approver roles
DELETE FROM public.pssr_allowed_approver_roles
WHERE role_id IN (
  SELECT id FROM public.roles 
  WHERE name IN (
    'Process TA2 - Asset', 'Elect TA2 - Asset', 'Static TA2 - Asset',
    'Rotating TA2 - Asset', 'PACO TA2 - Asset', 'MCI TA2 - Asset',
    'Civil TA2', 'Tech Safety TA2'
  )
);

-- Add Engr. Manager Asset to PSSR allowed approver roles
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles WHERE name = 'Engr. Manager Asset'
ON CONFLICT DO NOTHING;

-- Remove approve_pssr permission from all Asset TA2 roles
DELETE FROM public.role_permissions
WHERE permission = 'approve_pssr'
AND role_id IN (
  SELECT id FROM public.roles 
  WHERE name IN (
    'Process TA2 - Asset', 'Elect TA2 - Asset', 'Static TA2 - Asset',
    'Rotating TA2 - Asset', 'PACO TA2 - Asset', 'MCI TA2 - Asset',
    'Civil TA2', 'Tech Safety TA2'
  )
);

-- Ensure Engr. Manager Asset has approve_pssr permission
INSERT INTO public.role_permissions (role_id, permission)
SELECT id, 'approve_pssr'::app_permission FROM public.roles WHERE name = 'Engr. Manager Asset'
ON CONFLICT DO NOTHING;
