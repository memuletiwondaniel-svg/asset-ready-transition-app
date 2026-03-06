-- Backfill: Add Victor Liew (Project Hub Lead) as missing approver for DP-300 ORA Plan
-- and revert plan status to PENDING_APPROVAL since Victor hasn't reviewed yet
INSERT INTO orp_approvals (orp_plan_id, approver_role, approver_user_id, status)
VALUES ('2b88ecdf-3ba1-4198-9501-c27fe2edd7aa', 'Project Hub Lead', '73734adc-61dd-4557-b613-84fe0ed2f49f', 'PENDING')
ON CONFLICT DO NOTHING;

-- Revert the plan status since not all approvers have approved
UPDATE orp_plans
SET status = 'PENDING_APPROVAL'
WHERE id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa'
  AND status = 'APPROVED';