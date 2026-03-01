-- Delete related user_tasks for this P2A plan
DELETE FROM public.user_tasks 
WHERE metadata->>'plan_id' = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2';

-- Delete the P2A plan (cascades to systems, phases, VCRs, approvers, etc.)
DELETE FROM public.p2a_handover_plans 
WHERE id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2';