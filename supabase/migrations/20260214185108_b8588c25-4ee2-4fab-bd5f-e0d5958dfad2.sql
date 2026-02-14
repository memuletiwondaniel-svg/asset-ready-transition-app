-- Data repair: Remove duplicate pending Phase 2 task for Ewan (Deputy Plant Director)
-- He has a completed task (21ceedcd) and a duplicate pending task (c5a40af0)
DELETE FROM public.user_tasks WHERE id = 'c5a40af0-1a85-472d-83de-b8476bf0192d';

-- Update plan status to COMPLETED since all 5 approvers are APPROVED
UPDATE public.p2a_handover_plans 
SET status = 'COMPLETED' 
WHERE id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' 
  AND status = 'ACTIVE';