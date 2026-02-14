INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, metadata)
VALUES 
  (
    '0c8134fd-7bde-491c-be5a-96b3a63c048c',
    'Review & Approve P2A Handover Plan – DP-300',
    'You have been assigned as Project Hub Lead to review and approve the P2A Handover Plan for project DP-300.',
    'approval', 'High', 'pending',
    '{"plan_id": "7da85ab4-9ed7-402a-b137-ca0dfc8859c2", "project_id": "76901c6c-927d-4266-aaea-bc036888f274", "project_code": "DP-300", "approver_role": "Project Hub Lead", "approval_phase": 1, "source": "p2a_handover"}'::jsonb
  ),
  (
    '3a4faa89-093a-4116-97ff-a08d14ee6a48',
    'Review & Approve P2A Handover Plan – DP-300',
    'You have been assigned as ORA Lead to review and approve the P2A Handover Plan for project DP-300.',
    'approval', 'High', 'pending',
    '{"plan_id": "7da85ab4-9ed7-402a-b137-ca0dfc8859c2", "project_id": "76901c6c-927d-4266-aaea-bc036888f274", "project_code": "DP-300", "approver_role": "ORA Lead", "approval_phase": 1, "source": "p2a_handover"}'::jsonb
  );