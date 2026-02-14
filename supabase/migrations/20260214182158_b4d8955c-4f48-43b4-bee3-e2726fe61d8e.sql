
UPDATE public.p2a_handover_approvers
SET display_order = CASE role_name
  WHEN 'ORA Lead' THEN 1
  WHEN 'CSU Lead' THEN 2
  WHEN 'Construction Lead' THEN 3
  WHEN 'Project Hub Lead' THEN 4
  WHEN 'Deputy Plant Director' THEN 5
END
WHERE handover_id = '7da85ab4-a03c-4608-882b-63c1e2a8239a'
  AND role_name IN ('ORA Lead', 'CSU Lead', 'Construction Lead', 'Project Hub Lead', 'Deputy Plant Director');
