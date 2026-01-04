-- Step 1: Insert "Process TA2 (Asset)" role if it doesn't exist
INSERT INTO public.roles (name, description, is_active)
VALUES ('Process TA2 (Asset)', 'Process Technical Authority Level 2 for Asset operations', true)
ON CONFLICT DO NOTHING;

-- Step 2: Add "Process TA2 (Asset)" to the allowed PSSR approver roles if not already there
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles WHERE name = 'Process TA2 (Asset)'
ON CONFLICT DO NOTHING;

-- Step 3: Add Process TA2 (Asset) to the PSSR reason "Start-up following changes to operating modes or conditions"
DO $$
DECLARE
  process_ta2_role_id UUID;
  target_reason_id UUID;
BEGIN
  -- Get the Process TA2 (Asset) role ID
  SELECT id INTO process_ta2_role_id FROM public.roles WHERE name = 'Process TA2 (Asset)';
  
  -- Get the reason ID for "Start-up following changes to operating modes or conditions"
  SELECT id INTO target_reason_id FROM public.pssr_reasons 
  WHERE name ILIKE '%Start-up following changes to operating modes or conditions%'
  LIMIT 1;
  
  IF target_reason_id IS NOT NULL AND process_ta2_role_id IS NOT NULL THEN
    -- Insert or update the configuration to include Process TA2 (Asset)
    INSERT INTO public.pssr_reason_configuration (reason_id, pssr_approver_role_ids)
    VALUES (target_reason_id, ARRAY[process_ta2_role_id]::UUID[])
    ON CONFLICT (reason_id) DO UPDATE
    SET pssr_approver_role_ids = 
      CASE 
        WHEN pssr_reason_configuration.pssr_approver_role_ids @> ARRAY[process_ta2_role_id]::UUID[]
        THEN pssr_reason_configuration.pssr_approver_role_ids
        ELSE array_append(COALESCE(pssr_reason_configuration.pssr_approver_role_ids, '{}'::UUID[]), process_ta2_role_id)
      END;
  END IF;
END $$;