-- Add Dean Nye as an ORA Plan Approver for DP-300
INSERT INTO public.orp_approvals (
  orp_plan_id,
  approver_role,
  approver_user_id,
  status,
  approved_at,
  comments
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'ORA Plan Approver',
  'b088f1f6-aee4-45fa-9cea-febdfbbe4249',
  'APPROVED',
  '2026-01-16 11:00:00+00',
  'Reviewed ORA plan deliverables and phase requirements. All criteria met. Approved.'
);