
-- Backfill VCR delivery plan tasks for Anuarbek (Snr ORA Engr)
-- These were silently rejected by RLS when Daniel approved the P2A plan

DO $$
DECLARE
  v_anuarbek_id uuid := '49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  v_plan_id uuid := '4bb9517f-2779-4414-b866-921230d56218';
  v_project_id uuid := '76901c6c-927d-4266-aaea-bc036888f274';
  v_project_code text := 'DP-300';
  v_task_id uuid;
BEGIN
  -- VCR-01: Power & Utilities
  SELECT public.create_user_task(
    v_anuarbek_id,
    'Develop VCR-01 Plan – Power & Utilities',
    'Set up the VCR Plan for Power & Utilities. Configure training, procedures, critical documents, systems, and other building blocks.',
    'vcr_delivery_plan',
    'pending',
    'High',
    jsonb_build_object(
      'plan_id', v_plan_id::text,
      'project_id', v_project_id::text,
      'project_code', v_project_code,
      'ora_plan_activity_id', '10345f16-1323-4ad9-a574-30f284ed7345',
      'vcr_id', '6a416b9d-2799-471f-af19-07136c28cc1b',
      'vcr_code', 'VCR-DP300-01',
      'vcr_name', 'Power & Utilities',
      'vcr_seq_code', 'VCR-01',
      'action', 'create_vcr_delivery_plan',
      'source', 'p2a_handover'
    )
  ) INTO v_task_id;
  UPDATE ora_plan_activities SET task_id = v_task_id, assigned_to = v_anuarbek_id WHERE id = '10345f16-1323-4ad9-a574-30f284ed7345';

  -- VCR-02: OSBL
  SELECT public.create_user_task(
    v_anuarbek_id,
    'Develop VCR-02 Plan – OSBL',
    'Set up the VCR Plan for OSBL. Configure training, procedures, critical documents, systems, and other building blocks.',
    'vcr_delivery_plan',
    'pending',
    'High',
    jsonb_build_object(
      'plan_id', v_plan_id::text,
      'project_id', v_project_id::text,
      'project_code', v_project_code,
      'ora_plan_activity_id', '705c3c49-da24-4a5a-a66e-f67e8f7e1e1e',
      'vcr_id', '96b44257-5c3b-4ec8-be04-1ada2d792257',
      'vcr_code', 'VCR-DP300-02',
      'vcr_name', 'OSBL',
      'vcr_seq_code', 'VCR-02',
      'action', 'create_vcr_delivery_plan',
      'source', 'p2a_handover'
    )
  ) INTO v_task_id;
  UPDATE ora_plan_activities SET task_id = v_task_id, assigned_to = v_anuarbek_id WHERE id = '705c3c49-da24-4a5a-a66e-f67e8f7e1e1e';

  -- VCR-03: Compressor A and B
  SELECT public.create_user_task(
    v_anuarbek_id,
    'Develop VCR-03 Plan – Compressor A and B',
    'Set up the VCR Plan for Compressor A and B. Configure training, procedures, critical documents, systems, and other building blocks.',
    'vcr_delivery_plan',
    'pending',
    'High',
    jsonb_build_object(
      'plan_id', v_plan_id::text,
      'project_id', v_project_id::text,
      'project_code', v_project_code,
      'ora_plan_activity_id', '1f93d57c-dfba-4ff7-9dbc-5e771f5cf26a',
      'vcr_id', '5ea5a13a-f73f-45e4-9fcc-7ce51dc6fbf9',
      'vcr_code', 'VCR-DP300-03',
      'vcr_name', 'Compressor A and B',
      'vcr_seq_code', 'VCR-03',
      'action', 'create_vcr_delivery_plan',
      'source', 'p2a_handover'
    )
  ) INTO v_task_id;
  UPDATE ora_plan_activities SET task_id = v_task_id, assigned_to = v_anuarbek_id WHERE id = '1f93d57c-dfba-4ff7-9dbc-5e771f5cf26a';

  -- VCR-04: Compressor C and D
  SELECT public.create_user_task(
    v_anuarbek_id,
    'Develop VCR-04 Plan – Compressor C and D',
    'Set up the VCR Plan for Compressor C and D. Configure training, procedures, critical documents, systems, and other building blocks.',
    'vcr_delivery_plan',
    'pending',
    'High',
    jsonb_build_object(
      'plan_id', v_plan_id::text,
      'project_id', v_project_id::text,
      'project_code', v_project_code,
      'ora_plan_activity_id', 'ecbf93ce-e9bc-44a7-949c-901d033c89db',
      'vcr_id', '3f92ec99-886d-4e92-914b-428f92a7e9c0',
      'vcr_code', 'VCR-DP300-04',
      'vcr_name', 'Compressor C and D',
      'vcr_seq_code', 'VCR-04',
      'action', 'create_vcr_delivery_plan',
      'source', 'p2a_handover'
    )
  ) INTO v_task_id;
  UPDATE ora_plan_activities SET task_id = v_task_id, assigned_to = v_anuarbek_id WHERE id = 'ecbf93ce-e9bc-44a7-949c-901d033c89db';

  -- VCR-05: MOE Power
  SELECT public.create_user_task(
    v_anuarbek_id,
    'Develop VCR-05 Plan – MOE Power',
    'Set up the VCR Plan for MOE Power. Configure training, procedures, critical documents, systems, and other building blocks.',
    'vcr_delivery_plan',
    'pending',
    'High',
    jsonb_build_object(
      'plan_id', v_plan_id::text,
      'project_id', v_project_id::text,
      'project_code', v_project_code,
      'ora_plan_activity_id', '7a6366a4-eaec-4ff6-9bf0-77567fe47a6c',
      'vcr_id', '2d593f80-ea58-4352-b72d-fcf5617f50f9',
      'vcr_code', 'VCR-DP300-05',
      'vcr_name', 'MOE Power',
      'vcr_seq_code', 'VCR-05',
      'action', 'create_vcr_delivery_plan',
      'source', 'p2a_handover'
    )
  ) INTO v_task_id;
  UPDATE ora_plan_activities SET task_id = v_task_id, assigned_to = v_anuarbek_id WHERE id = '7a6366a4-eaec-4ff6-9bf0-77567fe47a6c';
END;
$$;
