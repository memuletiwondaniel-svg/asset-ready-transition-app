
ALTER TABLE public.user_tasks DROP CONSTRAINT user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check
  CHECK (type = ANY (ARRAY[
    'approval','task','update','review',
    'vcr_checklist_bundle','vcr_approval_bundle',
    'pssr_checklist_bundle','pssr_approval_bundle',
    'ora_plan_review','ora_activity',
    'vcr_delivery_plan','ora_plan_creation','vcr_plan_resubmit','vcr_interdisciplinary_summary',
    'qualification_review','wh_delivery_bundle','wh_review',
    'training_action','training_review','procedure_action','procedure_review',
    'register_action','register_review','maintenance_action','maintenance_review',
    'vcr_item_action','vcr_item_review'
  ]));
