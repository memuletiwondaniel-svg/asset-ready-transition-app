-- Update all pssr_reason_configuration entries that reference old MTCE Lead role
-- Replace cd0c475f (MTCE Lead) with 60ba58d0 (Central Mtce Lead)
UPDATE pssr_reason_configuration
SET pssr_approver_role_ids = array_replace(
  pssr_approver_role_ids,
  'cd0c475f-b0e2-44dd-95f8-c3780faa1ecc',
  '60ba58d0-b295-4a24-88e9-139b15d3d101'
)
WHERE 'cd0c475f-b0e2-44dd-95f8-c3780faa1ecc' = ANY(pssr_approver_role_ids);