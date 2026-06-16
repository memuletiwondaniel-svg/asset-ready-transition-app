CREATE OR REPLACE VIEW public.v_vcr_plan_approver_tasks AS
WITH plan AS (
  SELECT a_1.handover_point_id,
    count(*) AS total_count,
    count(*) FILTER (WHERE a_1.status = 'APPROVED'::vcr_plan_approver_status) AS approved_count,
    bool_or(a_1.status = 'REJECTED'::vcr_plan_approver_status) AS any_rejected,
    bool_or(a_1.role_key = 'ora_lead'::text) AS has_ora_lead,
    max(a_1.status::text) FILTER (WHERE a_1.role_key = 'ora_lead'::text) AS ora_status,
    max(a_1.decided_at) FILTER (WHERE a_1.role_key = 'ora_lead'::text AND a_1.status = 'APPROVED'::vcr_plan_approver_status) AS ora_approved_at,
    ( SELECT jsonb_agg(jsonb_build_object('role_label', x.role_label, 'user_id', x.user_id)) AS jsonb_agg
        FROM vcr_plan_approvers x
        WHERE x.handover_point_id = a_1.handover_point_id AND x.status = 'REJECTED'::vcr_plan_approver_status) AS rejectors
  FROM vcr_plan_approvers a_1
  GROUP BY a_1.handover_point_id
), phase_calc AS (
  SELECT p.handover_point_id,
    p.total_count,
    p.approved_count,
    p.any_rejected,
    p.has_ora_lead,
    p.ora_status,
    p.ora_approved_at,
    p.rejectors,
    CASE
      WHEN NOT p.has_ora_lead THEN NULL::integer
      WHEN p.any_rejected THEN NULL::integer
      WHEN p.approved_count = p.total_count THEN NULL::integer
      WHEN p.ora_status = 'PENDING'::text THEN 1
      WHEN p.ora_status = 'APPROVED'::text THEN 2
      ELSE NULL::integer
    END AS phase
  FROM plan p
)
SELECT a.id AS approver_row_id,
  a.handover_point_id,
  hp.vcr_code,
  hp.name AS vcr_name,
  hpl.project_id,
  (pr.project_id_prefix || '-'::text) || pr.project_id_number AS project_code,
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
    WHEN a.status <> 'PENDING'::vcr_plan_approver_status THEN false
    WHEN pc.phase = 1 AND a.role_key = 'ora_lead'::text THEN true
    WHEN pc.phase = 2 AND a.role_key <> 'ora_lead'::text THEN true
    ELSE false
  END AS is_actionable,
  CASE
    WHEN a.role_key <> 'ora_lead'::text AND pc.ora_approved_at IS NOT NULL THEN pc.ora_approved_at
    ELSE a.created_at
  END AS task_created_at
FROM vcr_plan_approvers a
  JOIN p2a_handover_points hp ON hp.id = a.handover_point_id
  LEFT JOIN p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
  LEFT JOIN projects pr ON pr.id = hpl.project_id
  LEFT JOIN phase_calc pc ON pc.handover_point_id = a.handover_point_id;