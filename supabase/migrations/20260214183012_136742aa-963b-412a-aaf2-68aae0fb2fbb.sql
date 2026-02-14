
INSERT INTO public.user_tasks (user_id, title, description, priority, type, status, metadata)
VALUES (
  '08fab8c4-9ac1-4646-a823-b62761fd1c58',
  'Review & Approve P2A Handover Plan – DP-300',
  'You have been assigned as Construction Lead approver for the P2A Handover Plan (DP-300). Please review and provide your approval.',
  'High',
  'approval',
  'pending',
  '{"plan_id": "7da85ab4-9ed7-402a-b137-ca0dfc8859c2", "project_id": "76901c6c-927d-4266-aaea-bc036888f274", "project_code": "DP-300", "approver_role": "Construction Lead", "approval_phase": 1, "source": "p2a_handover"}'::jsonb
);
