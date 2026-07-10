DELETE FROM public.user_tasks
WHERE id IN (
  '34cb3570-5c30-4cce-bbc6-672d135c1152',  -- Abel Maouche stale approver bundle
  'd576f20b-e4bb-47eb-80e5-f3fb1b27fa16'   -- Anuarbek Bagytzhan stale approver bundle
)
AND type='vcr_approval_bundle'
AND metadata->>'vcr_label'='VCR-DP300-02: OSBL';