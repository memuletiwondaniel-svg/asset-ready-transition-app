-- Fix vcr_template_approvers to reflect actual approvals by ORA Lead role
-- Daniel (ORA Lead) completed reviews for all 3 templates
UPDATE public.vcr_template_approvers
SET 
  approval_status = 'approved',
  approved_at = now(),
  approved_by = '05b44255-4358-450c-8aa4-0558b31df70b'
WHERE role_id = '11d4cc74-146e-48d5-9a98-922dbf8c08f0'
  AND template_id IN (
    '363a831c-edb3-4224-a97f-2e8b11fac2dc',  -- Hydrocarbon Systems
    '2ebe8392-e404-4655-b9eb-46e4e3cb39e8',  -- Non-Hydrocarbon Systems
    '82c96f15-0f47-4f0f-8323-77d513714c9e'   -- Pipelines
  );