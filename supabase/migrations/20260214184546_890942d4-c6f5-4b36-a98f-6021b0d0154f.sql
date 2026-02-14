-- Create the missing Phase 2 task for Deputy Plant Director (Ewan McConnachie)
-- All Phase 1 approvers are already APPROVED but Phase 2 task was never generated
INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, metadata)
VALUES (
  '9358a12a-0c7c-44c7-a536-bb523c2e2829',
  'Final Approval – P2A Handover Plan DP300',
  'Technical review is complete. As Deputy Plant Director, please provide your final approval for the P2A Handover Plan for project DP300.',
  'approval',
  'High',
  'pending',
  jsonb_build_object(
    'plan_id', '7da85ab4-9ed7-402a-b137-ca0dfc8859c2',
    'project_id', '76901c6c-927d-4266-aaea-bc036888f274',
    'project_code', 'DP300',
    'approver_role', 'Deputy Plant Director',
    'approval_phase', 2,
    'source', 'p2a_handover'
  )
);