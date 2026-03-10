INSERT INTO public.user_tasks (
  user_id, title, description, type, status, priority, metadata
) VALUES (
  '49d052ff-e30f-4b1f-b10b-7edeb83db97e',
  'Develop P2A Plan – DP-300',
  'Create the Project to Asset (P2A) handover plan.',
  'task',
  'completed',
  'Medium',
  jsonb_build_object(
    'action', 'create_p2a_plan',
    'project_id', '76901c6c-927d-4266-aaea-bc036888f274',
    'project_code', 'DP-300',
    'plan_status', 'ACTIVE',
    'completion_percentage', 95,
    'source', 'ora_workflow',
    'ora_plan_activity_id', (SELECT id::text FROM ora_plan_activities WHERE orp_plan_id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa' AND activity_code = 'P2A-01' LIMIT 1)
  )
);