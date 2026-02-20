
UPDATE public.pssr_reason_configuration
SET sof_approver_role_ids = array_append(sof_approver_role_ids, '62c2424d-6ce8-40d6-9979-5b7222efff50'),
    updated_at = now()
WHERE id = '7419cb83-6ec5-461d-8069-ed5e2b77e1c9';
