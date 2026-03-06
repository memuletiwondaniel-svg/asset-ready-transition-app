-- Add ora_plan_review and ora_activity to allowed types
ALTER TABLE public.user_tasks DROP CONSTRAINT user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check 
  CHECK (type = ANY (ARRAY['approval','task','update','review','vcr_checklist_bundle','vcr_approval_bundle','pssr_checklist_bundle','pssr_approval_bundle','ora_plan_review','ora_activity','vcr_delivery_plan','ora_plan_creation']));

-- Now insert the task for Roaa (orp_approvals was already inserted by previous migration)
INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, tenant_id, metadata)
VALUES (
  '0c8134fd-7bde-491c-be5a-96b3a63c048c',
  'Review ORA Plan – DP300 - HM Additional Compressors',
  'You have been assigned as ORA Lead to review and approve the ORA Plan for project DP300 - HM Additional Compressors.',
  'ora_plan_review',
  'pending',
  'High',
  '63c14b6f-66d9-4963-bcd2-287662d538e2',
  '{"source":"ora_workflow","project_id":"76901c6c-927d-4266-aaea-bc036888f274","plan_id":"2b88ecdf-3ba1-4198-9501-c27fe2edd7aa","project_name":"DP300 - HM Additional Compressors","approver_role":"ORA Lead","action":"review_ora_plan"}'::jsonb
);