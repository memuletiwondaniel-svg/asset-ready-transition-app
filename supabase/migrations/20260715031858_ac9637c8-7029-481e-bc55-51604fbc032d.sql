
INSERT INTO public.user_tasks (user_id, title, description, priority, type, status, metadata, dedupe_key)
SELECT
  a.user_id,
  'Review Qualification Q-' || LPAD(q.q_number::text,3,'0') || ' for ' || hp.vcr_code || ' (' || hp.name || ')',
  q.reason,
  'High',
  'qualification_review',
  'open',
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
WHERE a.status = 'PENDING'
  AND q.status = 'PENDING'
  AND hp.id = '96b44257-5c3b-4ec8-be04-1ada2d792257'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_tasks ut
    WHERE ut.dedupe_key = 'qual_review:' || q.id || ':' || a.user_id
  );
