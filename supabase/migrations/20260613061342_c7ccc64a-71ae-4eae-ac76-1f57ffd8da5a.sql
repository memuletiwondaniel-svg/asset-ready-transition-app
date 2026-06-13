DROP VIEW IF EXISTS public.v_vcr_plan_approver_tasks;

CREATE VIEW public.v_vcr_plan_approver_tasks
WITH (security_invoker = true) AS
WITH plan AS (
  SELECT
    a.handover_point_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.status='APPROVED') AS approved_count,
    bool_or(a.status='REJECTED') AS any_rejected,
    bool_or(a.role_key='ora_lead') AS has_ora_lead,
    max(a.status::text) FILTER (WHERE a.role_key='ora_lead') AS ora_status,
    (SELECT jsonb_agg(jsonb_build_object('role_label', x.role_label, 'user_id', x.user_id))
       FROM public.vcr_plan_approvers x
      WHERE x.handover_point_id = a.handover_point_id AND x.status='REJECTED') AS rejectors
  FROM public.vcr_plan_approvers a
  GROUP BY a.handover_point_id
),
phase_calc AS (
  SELECT p.*,
    CASE
      WHEN NOT p.has_ora_lead THEN NULL::int
      WHEN p.any_rejected THEN NULL::int
      WHEN p.approved_count = p.total_count THEN NULL::int
      WHEN p.ora_status='PENDING' THEN 1
      WHEN p.ora_status='APPROVED' THEN 2
      ELSE NULL::int
    END AS phase
  FROM plan p
)
SELECT
  a.id AS approver_row_id,
  a.handover_point_id,
  hp.vcr_code,
  hp.name AS vcr_name,
  hpl.project_id,
  (pr.project_id_prefix || '-' || pr.project_id_number) AS project_code,
  a.user_id,
  a.role_key,
  a.role_label,
  a.approver_order,
  a.status AS row_status,
  a.decided_at,
  a.comments,
  pc.phase,
  pc.total_count,
  pc.approved_count,
  pc.any_rejected,
  pc.has_ora_lead,
  pc.rejectors,
  hp.execution_plan_status,
  CASE
    WHEN NOT pc.has_ora_lead THEN false
    WHEN pc.any_rejected THEN false
    WHEN a.status <> 'PENDING' THEN false
    WHEN pc.phase = 1 AND a.role_key = 'ora_lead' THEN true
    WHEN pc.phase = 2 AND a.role_key <> 'ora_lead' THEN true
    ELSE false
  END AS is_actionable
FROM public.vcr_plan_approvers a
JOIN public.p2a_handover_points hp ON hp.id = a.handover_point_id
LEFT JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
LEFT JOIN public.projects pr ON pr.id = hpl.project_id
LEFT JOIN phase_calc pc ON pc.handover_point_id = a.handover_point_id;

GRANT SELECT ON public.v_vcr_plan_approver_tasks TO authenticated, anon;