-- Remove create_pssr from all Asset TA2 roles and Civil/Tech Safety TA2
DELETE FROM public.role_permissions
WHERE permission = 'create_pssr'
AND role_id IN (
  SELECT id FROM public.roles 
  WHERE name IN (
    'Process TA2 - Asset', 'Elect TA2 - Asset', 'Static TA2 - Asset',
    'Rotating TA2 - Asset', 'PACO TA2 - Asset', 'MCI TA2 - Asset',
    'Civil TA2', 'Tech Safety TA2'
  )
);