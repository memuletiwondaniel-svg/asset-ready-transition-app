-- Fix VCR codes to match wizard format: VCR-{projectCode}-{seq}
-- Current malformed: VCR-003-DP300 → Correct: VCR-DP300-001

WITH ranked AS (
  SELECT hp.id as point_id, hp.handover_plan_id, hp.created_at,
    REPLACE(COALESCE(hpl.project_code, 'UNKNOWN'), '-', '') as clean_code,
    ROW_NUMBER() OVER (PARTITION BY hp.handover_plan_id ORDER BY hp.created_at) as rn
  FROM p2a_handover_points hp
  JOIN p2a_handover_plans hpl ON hp.handover_plan_id = hpl.id
)
UPDATE p2a_handover_points hp
SET vcr_code = 'VCR-' || r.clean_code || '-' || LPAD(r.rn::TEXT, 3, '0')
FROM ranked r
WHERE hp.id = r.point_id;