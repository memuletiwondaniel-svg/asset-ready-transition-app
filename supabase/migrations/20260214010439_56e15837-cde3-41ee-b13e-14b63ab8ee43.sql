
-- Seed user_tasks for existing under_review VCR templates
INSERT INTO user_tasks (user_id, title, description, type, priority, status, metadata)
SELECT 
  p.user_id,
  'Review VCR Template: ' || vt.summary,
  'A VCR template "' || vt.summary || '" has been submitted for your review and approval.',
  'review',
  'Medium',
  'pending',
  jsonb_build_object('template_id', vt.id::text, 'template_name', vt.summary)
FROM vcr_template_approvers vta
JOIN vcr_templates vt ON vt.id = vta.template_id
JOIN profiles p ON p.role = vta.role_id AND p.is_active = true AND p.account_status = 'active'
WHERE vt.status = 'under_review'
  AND vta.approval_status = 'pending'
ON CONFLICT DO NOTHING;
