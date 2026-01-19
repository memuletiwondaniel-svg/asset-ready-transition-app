-- Add Dean Nye and Ali Talib as distinct ORA Plan Approvers for DP-300 ORA Plan
INSERT INTO public.orp_approvals (id, orp_plan_id, approver_role, approver_user_id, status, approved_at, comments, created_at)
VALUES 
  (
    gen_random_uuid(),
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'Mtce Lead',
    '9c62d0ed-f263-4a11-900c-543bfe68da08', -- Dean Nye
    'APPROVED',
    '2026-01-17 14:30:00+00',
    'Reviewed all deliverables and confirmed alignment with OR&A standards. Maintenance readiness documentation is comprehensive. Approved.',
    now()
  ),
  (
    gen_random_uuid(),
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'Operations Reviewer',
    '29821a0f-4b77-419c-bf31-dd27db574732', -- Ali Talib Al-Friji
    'APPROVED',
    '2026-01-18 09:15:00+00',
    'All phase deliverables have been verified. Training plan and handover items are in order. Approved for execution.',
    now()
  );