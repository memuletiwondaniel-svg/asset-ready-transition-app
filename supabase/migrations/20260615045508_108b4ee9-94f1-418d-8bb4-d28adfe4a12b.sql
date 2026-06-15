ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'PSSR_REVIEW_REQUEST'::text,
  'PSSR_APPROVED'::text,
  'PSSR_REJECTED'::text,
  'TASK_DELEGATED'::text,
  'vcr_plan_phase1_approved'::text,
  'vcr_plan_changes_requested'::text,
  'vcr_plan_approved'::text
]));