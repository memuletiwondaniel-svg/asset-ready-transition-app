
-- Fix the current data: sync approved statuses from user_tasks to p2a_handover_approvers
UPDATE public.p2a_handover_approvers
SET status = 'APPROVED', approved_at = now()
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2'
  AND role_name IN ('ORA Lead', 'CSU Lead', 'Construction Lead');
