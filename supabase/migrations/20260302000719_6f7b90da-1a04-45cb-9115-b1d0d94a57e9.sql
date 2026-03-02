
-- Remove create_project from all roles EXCEPT the specified ones
DELETE FROM public.role_permissions
WHERE permission = 'create_project'
AND role_id NOT IN (
  SELECT id FROM public.roles 
  WHERE name IN (
    'Project Manager', 'Project Hub Lead', 'Project Engr', 
    'Commissioning Lead', 'Construction Lead',
    'ORA Engr.', 'ORA Lead', 'Snr. ORA Engr.'
  )
);
