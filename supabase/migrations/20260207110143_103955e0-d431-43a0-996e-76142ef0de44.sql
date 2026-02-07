-- Fix malformed VCR codes: VCR-001-DPDP-300 → VCR-XXX-DP300
-- Assign unique sequential numbers to each malformed VCR
WITH ranked AS (
  SELECT id, vcr_code,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM p2a_handover_points
  WHERE vcr_code LIKE '%DPDP%'
)
UPDATE p2a_handover_points hp
SET vcr_code = 'VCR-' || LPAD(r.rn::TEXT, 3, '0') || '-DP300'
FROM ranked r
WHERE hp.id = r.id;