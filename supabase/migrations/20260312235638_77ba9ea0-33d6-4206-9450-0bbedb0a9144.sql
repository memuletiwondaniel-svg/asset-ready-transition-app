-- Backfill missing P2A approver decision history for the affected plan
-- Plan: 4bb9517f-2779-4414-b866-921230d56218 (DP-300)
WITH candidate_decisions AS (
  SELECT
    t.user_id,
    (t.metadata->>'plan_id')::uuid AS handover_id,
    t.metadata->>'approver_role' AS role_name,
    CASE
      WHEN lower(coalesce(t.metadata->>'outcome', '')) = 'rejected'
        OR coalesce(t.metadata->>'rejection_comment', '') <> '' THEN 'REJECTED'
      ELSE 'APPROVED'
    END AS decision_status,
    nullif(coalesce(t.metadata->>'rejection_comment', t.metadata->>'review_comment', ''), '') AS decision_comment,
    coalesce((t.metadata->>'rejected_at')::timestamptz, t.updated_at, t.created_at) AS decision_at
  FROM public.user_tasks t
  WHERE t.type = 'approval'
    AND t.metadata->>'source' = 'p2a_handover'
    AND t.metadata->>'plan_id' = '4bb9517f-2779-4414-b866-921230d56218'
    AND t.metadata->>'approver_role' IS NOT NULL
    AND (
      t.status = 'completed'
      OR (t.status = 'cancelled' AND coalesce(t.metadata->>'rejection_comment', '') <> '')
    )
),
latest_decision_per_role AS (
  SELECT DISTINCT ON (role_name)
    user_id,
    handover_id,
    role_name,
    decision_status,
    decision_comment,
    decision_at
  FROM candidate_decisions
  ORDER BY role_name, decision_at DESC
),
rows_to_insert AS (
  SELECT
    c.handover_id,
    c.user_id,
    c.role_name,
    coalesce(
      pa.display_order,
      CASE c.role_name
        WHEN 'ORA Lead' THEN 1
        WHEN 'CSU Lead' THEN 2
        WHEN 'Commissioning Lead' THEN 2
        WHEN 'Construction Lead' THEN 3
        WHEN 'Project Hub Lead' THEN 4
        WHEN 'Deputy Plant Director' THEN 5
        ELSE 99
      END
    ) AS display_order,
    c.decision_status AS status,
    c.decision_at AS approved_at,
    c.decision_comment AS comments,
    coalesce(
      (SELECT max(h.cycle) FROM public.p2a_approver_history h WHERE h.handover_id = c.handover_id),
      1
    ) AS cycle
  FROM latest_decision_per_role c
  LEFT JOIN LATERAL (
    SELECT display_order
    FROM public.p2a_handover_approvers pa
    WHERE pa.handover_id = c.handover_id
      AND pa.role_name = c.role_name
    ORDER BY pa.created_at DESC
    LIMIT 1
  ) pa ON true
  WHERE EXISTS (
    SELECT 1
    FROM public.p2a_handover_approvers curr
    WHERE curr.handover_id = c.handover_id
      AND curr.role_name = c.role_name
      AND curr.status = 'PENDING'
      AND curr.approved_at IS NULL
  )
)
INSERT INTO public.p2a_approver_history (
  handover_id,
  user_id,
  role_name,
  display_order,
  status,
  approved_at,
  comments,
  cycle
)
SELECT
  r.handover_id,
  r.user_id,
  r.role_name,
  r.display_order,
  r.status,
  r.approved_at,
  r.comments,
  r.cycle
FROM rows_to_insert r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.p2a_approver_history h
  WHERE h.handover_id = r.handover_id
    AND h.role_name = r.role_name
    AND h.status = r.status
    AND h.cycle = r.cycle
    AND h.user_id IS NOT DISTINCT FROM r.user_id
    AND coalesce(h.comments, '') = coalesce(r.comments, '')
);