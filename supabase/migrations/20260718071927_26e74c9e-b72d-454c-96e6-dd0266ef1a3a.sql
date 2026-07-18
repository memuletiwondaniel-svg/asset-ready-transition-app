
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_source_plan_table_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_source_plan_table_check
  CHECK (source_plan_table IS NULL OR source_plan_table = ANY (ARRAY[
    'orp_plans','p2a_handover_plans','p2a_handover_points',
    'p2a_vcr_training','p2a_vcr_procedures','p2a_vcr_operational_registers',
    'p2a_vcr_maintenance_deliverables',
    'p2a_vcr_prerequisites','vcr_plan_approvers','sof_approvers','vcr_pac_approvers'
  ]));
