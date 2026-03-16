
-- Update VCR codes from 3-digit to 2-digit sequence format
-- e.g. VCR-DP300-001 → VCR-DP300-01
UPDATE p2a_handover_points
SET vcr_code = regexp_replace(vcr_code, '^(VCR-[A-Z0-9]+-)0*(\d{1,2})$', '\1' || LPAD('\2', 2, '0'))
WHERE vcr_code ~ '^VCR-[A-Z0-9]+-\d{3,}$';

-- More direct approach: extract the trailing number, reformat with 2 digits
UPDATE p2a_handover_points
SET vcr_code = regexp_replace(vcr_code, '-(\d{3})$', '-' || LPAD(LTRIM(substring(vcr_code from '-(\d{3})$'), '0'), 2, '0'))
WHERE vcr_code ~ '-\d{3}$';
