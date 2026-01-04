-- Step 1: Insert "MTCE Manager" into the roles table
INSERT INTO public.roles (name, description, is_active)
VALUES ('MTCE Manager', 'Maintenance Manager responsible for operational changes and major maintenance', true)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Add "MTCE Manager" to the allowed PSSR approver roles
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles WHERE name = 'MTCE Manager'
ON CONFLICT DO NOTHING;

-- Step 3: Automatically assign MTCE Manager as an approver for all existing PSSR reasons under the OPS_MTCE category
DO $$
DECLARE
  mtce_manager_id UUID;
  ops_mtce_category_id UUID;
  reason_record RECORD;
BEGIN
  SELECT id INTO mtce_manager_id FROM public.roles WHERE name = 'MTCE Manager';
  SELECT id INTO ops_mtce_category_id FROM public.pssr_reason_categories WHERE code = 'OPS_MTCE';
  
  -- Update each reason's configuration to include MTCE Manager
  FOR reason_record IN 
    SELECT r.id 
    FROM public.pssr_reasons r
    WHERE r.category_id = ops_mtce_category_id
  LOOP
    -- Insert or update the configuration
    INSERT INTO public.pssr_reason_configuration (reason_id, pssr_approver_role_ids)
    VALUES (reason_record.id, ARRAY[mtce_manager_id]::UUID[])
    ON CONFLICT (reason_id) DO UPDATE
    SET pssr_approver_role_ids = array_append(
      COALESCE(pssr_reason_configuration.pssr_approver_role_ids, '{}'::UUID[]),
      mtce_manager_id
    )
    WHERE NOT (COALESCE(pssr_reason_configuration.pssr_approver_role_ids, '{}'::UUID[]) @> ARRAY[mtce_manager_id]::UUID[]);
  END LOOP;
END $$;