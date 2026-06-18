ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check CHECK (type = ANY (ARRAY[
  'approval'::text,
  'task'::text,
  'update'::text,
  'review'::text,
  'vcr_checklist_bundle'::text,
  'vcr_approval_bundle'::text,
  'pssr_checklist_bundle'::text,
  'pssr_approval_bundle'::text,
  'ora_plan_review'::text,
  'ora_activity'::text,
  'vcr_delivery_plan'::text,
  'ora_plan_creation'::text,
  'vcr_plan_resubmit'::text
]));