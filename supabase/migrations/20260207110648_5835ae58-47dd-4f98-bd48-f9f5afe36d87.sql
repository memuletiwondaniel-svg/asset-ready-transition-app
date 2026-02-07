-- Fix the handover plan's project_code
UPDATE p2a_handover_plans 
SET project_code = 'DP300'
WHERE id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2';

-- Fix VCR codes for this plan to match wizard format
UPDATE p2a_handover_points
SET vcr_code = 'VCR-DP300-' || LPAD(rn::TEXT, 3, '0')
FROM (
  SELECT id as pid, 
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM p2a_handover_points
  WHERE handover_plan_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2'
) sub
WHERE p2a_handover_points.id = sub.pid;