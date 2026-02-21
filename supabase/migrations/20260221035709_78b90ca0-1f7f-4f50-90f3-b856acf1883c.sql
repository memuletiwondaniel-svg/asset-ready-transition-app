-- Reset PSSR-BNGL-2026-001 status back to Draft for resubmission testing
UPDATE public.pssrs SET status = 'DRAFT' WHERE pssr_id = 'PSSR-BNGL-2026-001';

-- Clean up associated approvers and notifications
DELETE FROM public.pssr_approvers WHERE pssr_id = '4d9cc686-028e-49f1-9873-0a22e23b3639';
DELETE FROM public.sof_approvers WHERE pssr_id = '4d9cc686-028e-49f1-9873-0a22e23b3639';
DELETE FROM public.notifications WHERE pssr_id = '4d9cc686-028e-49f1-9873-0a22e23b3639';