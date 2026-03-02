
-- Remove create_ora_plan from all roles EXCEPT ORA Engr., ORA Lead, and Snr. ORA Engr.
DELETE FROM public.role_permissions
WHERE permission = 'create_ora_plan'
AND role_id NOT IN (
  SELECT id FROM public.roles 
  WHERE name IN ('ORA Engr.', 'ORA Lead', 'Snr. ORA Engr.')
);
