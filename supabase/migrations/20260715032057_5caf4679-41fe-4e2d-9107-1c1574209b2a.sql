
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check
  CHECK (type = ANY (ARRAY['approval','task','update','review','vcr_checklist_bundle','vcr_approval_bundle','pssr_checklist_bundle','pssr_approval_bundle','ora_plan_review','ora_activity','vcr_delivery_plan','ora_plan_creation','vcr_plan_resubmit','vcr_interdisciplinary_summary','qualification_review']));

DO $$
DECLARE
  v_hp uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_q1 uuid := '7d515b8c-715a-4313-bb85-8516cc23c411';
  v_q2 uuid := '95e0c502-4721-4c95-a651-5e272957cfe4';
  v_q3 uuid := 'baa0eb7b-9c50-4bbd-812a-439d35e17227';
  v_u1 uuid := '0c8134fd-7bde-491c-be5a-96b3a63c048c';
  v_u2 uuid := '73734adc-61dd-4557-b613-84fe0ed2f49f';
  v_u3 uuid := '9ff2d8e8-f2a0-4c29-9b60-5ab225beb0f6';
  v_new_qual uuid;
BEGIN
  INSERT INTO public.vcr_qualification_approvers (qualification_id,user_id,role_label,status)
  VALUES (v_q1, v_u1, 'Delivering Party', 'PENDING'),(v_q1, v_u2, 'Receiving Party', 'PENDING')
  ON CONFLICT (qualification_id, user_id) DO NOTHING;

  INSERT INTO public.vcr_qualification_approvers (qualification_id,user_id,role_label,status,decision_comment,decided_at)
  VALUES (v_q2, v_u1, 'Delivering Party','APPROVED','OK from delivering side.', now() - interval '4 days'),
         (v_q2, v_u2, 'Receiving Party','REJECTED','Evidence insufficient — resubmit with updated dossier.', now() - interval '3 days')
  ON CONFLICT (qualification_id, user_id) DO NOTHING;

  INSERT INTO public.vcr_qualification_approvers (qualification_id,user_id,role_label,status,decided_at)
  VALUES (v_q3, v_u1, 'Delivering Party','APPROVED', now() - interval '2 days'),
         (v_q3, v_u2, 'Receiving Party','APPROVED', now() - interval '1 day')
  ON CONFLICT (qualification_id, user_id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.p2a_vcr_qualifications WHERE handover_point_id=v_hp AND vcr_prerequisite_id='a6f119e8-ff9c-4daf-b8de-f4c0ee1caf4a') THEN
    INSERT INTO public.p2a_vcr_qualifications
      (vcr_prerequisite_id, handover_point_id, reason, mitigation, follow_up_action, target_date, action_owner_id, action_owner_name, status, submitted_by, submitted_at)
    VALUES
      ('a6f119e8-ff9c-4daf-b8de-f4c0ee1caf4a', v_hp,
       'DEM-2 conformance sign-off outstanding for two package items; requesting conditional handover pending closure.',
       'Interim ORA coverage plus weekly compliance review until items close.',
       'Complete DEM-2 sign-off for outstanding items and submit closure evidence.',
       (now() + interval '14 days')::date, v_u3, 'Delivering discipline lead', 'PENDING', v_u3, now() - interval '1 day')
    RETURNING id INTO v_new_qual;

    INSERT INTO public.vcr_qualification_approvers (qualification_id,user_id,role_label,status)
    VALUES (v_new_qual, v_u1, 'Delivering Party','PENDING'),(v_new_qual, v_u2, 'Receiving Party','PENDING')
    ON CONFLICT (qualification_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag, created_at)
  SELECT v_q1, v_u3, 'Qualification submitted for review.', 'submitted', now() - interval '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.vcr_qualification_comments WHERE qualification_id=v_q1 AND action_tag='submitted');

  INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag, created_at)
  SELECT v_q3, v_u3, 'Qualification submitted for review.', 'submitted', now() - interval '3 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.vcr_qualification_comments WHERE qualification_id=v_q3 AND action_tag='submitted');

  INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag, created_at)
  SELECT v_q3, v_u1, 'Approved — mitigation acceptable.', 'approved', now() - interval '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.vcr_qualification_comments WHERE qualification_id=v_q3 AND action_tag='approved' AND author_user_id=v_u1);

  INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag, created_at)
  SELECT v_q3, v_u2, 'Approved — receiving party accepts.', 'approved', now() - interval '1 day'
  WHERE NOT EXISTS (SELECT 1 FROM public.vcr_qualification_comments WHERE qualification_id=v_q3 AND action_tag='approved' AND author_user_id=v_u2);

  INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag, created_at)
  SELECT v_q2, v_u2, 'Evidence insufficient — resubmit with updated dossier.', 'rejected', now() - interval '3 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.vcr_qualification_comments WHERE qualification_id=v_q2 AND action_tag='rejected');
END $$;

INSERT INTO public.user_tasks (user_id, title, description, priority, type, status, metadata, dedupe_key)
SELECT
  a.user_id,
  'Review Qualification Q-' || LPAD(q.q_number::text,3,'0') || ' for ' || hp.vcr_code || ' (' || hp.name || ')',
  q.reason, 'High', 'qualification_review', 'pending',
  jsonb_build_object(
    'action','review_qualification',
    'qualification_id', q.id,
    'handover_point_id', q.handover_point_id,
    'vcr_code', hp.vcr_code,
    'vcr_name', hp.name,
    'q_number', q.q_number
  ),
  'qual_review:' || q.id || ':' || a.user_id
FROM public.vcr_qualification_approvers a
JOIN public.p2a_vcr_qualifications q ON q.id = a.qualification_id
JOIN public.p2a_handover_points hp ON hp.id = q.handover_point_id
WHERE a.status = 'PENDING' AND q.status = 'PENDING'
  AND hp.id = '96b44257-5c3b-4ec8-be04-1ada2d792257'
  AND NOT EXISTS (SELECT 1 FROM public.user_tasks ut WHERE ut.dedupe_key = 'qual_review:' || q.id || ':' || a.user_id);
