-- Restore P2A-01 activity in ora_plan_activities for project DP-300
INSERT INTO public.ora_plan_activities (
  id, orp_plan_id, activity_code, name, description,
  source_type, status, completion_percentage,
  start_date, end_date, duration_days,
  assigned_to, task_id
)
VALUES (
  gen_random_uuid(),
  '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa',
  'P2A-01',
  'Develop P2A Plan',
  'Create the Project to Asset (P2A) handover plan.',
  'p2a_workflow',
  'IN_PROGRESS',
  95,
  '2026-03-01',
  NULL,
  14,
  '49d052ff-e30f-4b1f-b10b-7edeb83db97e',
  '36efb9ea-1725-4a8d-a647-c8c85825301a'
)
ON CONFLICT DO NOTHING;

-- Now update user_tasks metadata with the correct plan_status, completion, and link the new activity
DO $$
DECLARE
  v_activity_id uuid;
BEGIN
  SELECT id INTO v_activity_id
  FROM public.ora_plan_activities
  WHERE orp_plan_id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa'
    AND activity_code = 'P2A-01'
  LIMIT 1;

  IF v_activity_id IS NOT NULL THEN
    UPDATE public.user_tasks
    SET
      status = 'completed',
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            metadata::jsonb,
            '{ora_plan_activity_id}', to_jsonb(v_activity_id::text)
          ),
          '{plan_status}', '"ACTIVE"'
        ),
        '{completion_percentage}', '95'
      ),
      updated_at = now()
    WHERE id = '36efb9ea-1725-4a8d-a647-c8c85825301a';
  END IF;
END $$;