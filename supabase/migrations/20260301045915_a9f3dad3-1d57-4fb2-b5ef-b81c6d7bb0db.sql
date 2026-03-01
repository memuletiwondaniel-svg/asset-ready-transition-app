INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata)
VALUES (
  '49d052ff-e30f-4b1f-b10b-7edeb83db97e',
  'Create ORA Plan',
  'Create the ORA Plan for project DP-300',
  'task',
  'pending',
  'High',
  '{"source": "ora_workflow", "project_id": "76901c6c-927d-4266-aaea-bc036888f274", "project_name": "DP-300", "action": "create_ora_plan"}'::jsonb
);