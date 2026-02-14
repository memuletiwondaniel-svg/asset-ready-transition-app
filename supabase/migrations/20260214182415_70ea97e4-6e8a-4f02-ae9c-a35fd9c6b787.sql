
UPDATE public.p2a_handover_approvers
SET display_order = CASE id
  WHEN '35cae172-ed2d-44e4-8d48-fc78e77dd79f' THEN 1  -- ORA Lead
  WHEN '680c1958-6f5c-4089-97d7-9681a9b7c801' THEN 2  -- CSU Lead
  WHEN '2074b2b3-3b26-4e7c-bfef-d8d402c7a35f' THEN 3  -- Construction Lead
  WHEN 'cb4a3646-797e-4073-bba4-8acc0bd9dad6' THEN 4  -- Project Hub Lead
  WHEN '746a0167-854f-4ae0-99b9-1d5b227e3c17' THEN 5  -- Deputy Plant Director
END
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2';
