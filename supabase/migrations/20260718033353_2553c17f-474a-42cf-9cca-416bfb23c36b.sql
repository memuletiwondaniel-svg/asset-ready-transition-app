DO $$
DECLARE
  v_reg uuid := '8a8f9c96-36fb-4009-83ca-3a325037b9d1';
  v_reviewer_uid uuid := '73734adc-61dd-4557-b613-84fe0ed2f49f';
  v_reviewer_profile uuid;
  v_title text;
BEGIN
  SELECT id INTO v_reviewer_profile FROM public.profiles WHERE user_id=v_reviewer_uid;
  SELECT title INTO v_title FROM public.p2a_vcr_operational_registers WHERE id=v_reg;

  INSERT INTO public.p2a_vcr_register_reviewers (register_id, reviewer_id, decision, reviewer_order)
  VALUES (v_reg, v_reviewer_profile, 'pending'::p2a_register_reviewer_decision, 1)
  ON CONFLICT DO NOTHING;

  PERFORM public._register_upsert_task(
    v_reviewer_uid, v_reg, 'UNDER_REVIEW'::p2a_register_workflow_status,
    'register_review', 'Review: '||v_title
  );
END $$;