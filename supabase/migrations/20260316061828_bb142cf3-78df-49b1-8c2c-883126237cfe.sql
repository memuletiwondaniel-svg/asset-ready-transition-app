
-- Fix VCR codes to proper 2-digit padding: VCR-DP300-1 → VCR-DP300-01
UPDATE p2a_handover_points
SET vcr_code = regexp_replace(vcr_code, '-(\d)$', '-0\1')
WHERE vcr_code ~ '-\d$' AND vcr_code NOT LIKE '%-%-%-%';
