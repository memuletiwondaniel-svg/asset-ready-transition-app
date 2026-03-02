
-- Step 1: Rename 6 existing TA2 roles to "X TA2 - Project"
UPDATE public.roles SET name = 'Process TA2 - Project', updated_at = now() WHERE name = 'Process TA2';
UPDATE public.roles SET name = 'Elect TA2 - Project', updated_at = now() WHERE name = 'Elect TA2';
UPDATE public.roles SET name = 'Static TA2 - Project', updated_at = now() WHERE name = 'Static TA2';
UPDATE public.roles SET name = 'Rotating TA2 - Project', updated_at = now() WHERE name = 'Rotating TA2';
UPDATE public.roles SET name = 'PACO TA2 - Project', updated_at = now() WHERE name = 'PACO TA2';
UPDATE public.roles SET name = 'MCI TA2 - Project', updated_at = now() WHERE name = 'MCI TA2';

-- Step 2: Create 6 new Asset TA2 roles under Engineering category
INSERT INTO public.roles (name, description, is_active, category_id)
VALUES
  ('Process TA2 - Asset', 'Asset Technical Authority - Process', true, '05314eee-4efc-4c24-9c2e-86a3006a1152'),
  ('Elect TA2 - Asset', 'Asset Technical Authority - Electrical', true, '05314eee-4efc-4c24-9c2e-86a3006a1152'),
  ('Static TA2 - Asset', 'Asset Technical Authority - Static', true, '05314eee-4efc-4c24-9c2e-86a3006a1152'),
  ('Rotating TA2 - Asset', 'Asset Technical Authority - Rotating', true, '05314eee-4efc-4c24-9c2e-86a3006a1152'),
  ('PACO TA2 - Asset', 'Asset Technical Authority - PACO', true, '05314eee-4efc-4c24-9c2e-86a3006a1152'),
  ('MCI TA2 - Asset', 'Asset Technical Authority - MCI', true, '05314eee-4efc-4c24-9c2e-86a3006a1152');

-- Step 3: Assign create_pssr and approve_pssr to all Asset TA2 roles + Civil TA2 + Tech Safety TA2
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, p.perm::public.app_permission
FROM public.roles r
CROSS JOIN (VALUES ('create_pssr'), ('approve_pssr')) AS p(perm)
WHERE r.name IN (
  'Process TA2 - Asset', 'Elect TA2 - Asset', 'Static TA2 - Asset',
  'Rotating TA2 - Asset', 'PACO TA2 - Asset', 'MCI TA2 - Asset',
  'Civil TA2', 'Tech Safety TA2'
)
AND r.is_active = true
ON CONFLICT DO NOTHING;
