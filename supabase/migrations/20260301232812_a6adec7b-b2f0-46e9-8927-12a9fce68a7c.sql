
-- Seed director roles: view_reports, approve_sof only
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, p.perm::app_permission
FROM public.roles r
CROSS JOIN (VALUES ('view_reports'), ('approve_sof')) AS p(perm)
WHERE r.name IN ('P&E Director', 'P&M Director', 'HSE Director', 'Mtce Director', 'Plant Director', 'Dep. Plant Director')
  AND r.is_active = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- ORA roles: create_vcr, create_p2a_plan, manage_p2a + standard
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, p.perm::app_permission
FROM public.roles r
CROSS JOIN (VALUES ('create_vcr'), ('create_p2a_plan'), ('manage_p2a'), ('create_project'), ('create_pssr'), ('create_ora_plan')) AS p(perm)
WHERE r.name IN ('ORA Engr.', 'ORA Lead', 'Snr. ORA Engr.')
  AND r.is_active = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- All other non-director roles: create_project, create_pssr, create_ora_plan
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, p.perm::app_permission
FROM public.roles r
CROSS JOIN (VALUES ('create_project'), ('create_pssr'), ('create_ora_plan')) AS p(perm)
WHERE r.name NOT IN ('P&E Director', 'P&M Director', 'HSE Director', 'Mtce Director', 'Plant Director', 'Dep. Plant Director', 'ORA Engr.', 'ORA Lead', 'Snr. ORA Engr.')
  AND r.is_active = true
ON CONFLICT (role_id, permission) DO NOTHING;
