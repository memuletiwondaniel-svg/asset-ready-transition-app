-- Backfill DP-18F: flip status to PENDING_APPROVAL so the existing
-- trg_create_p2a_ora_lead_review trigger fires and creates the ORA
-- Lead approver row + approval task naturally. Single row, idempotent.
UPDATE public.p2a_handover_plans
SET status = 'PENDING_APPROVAL',
    updated_at = now()
WHERE id = '290bbdf6-a112-44af-b5ae-e5ef08df305a'
  AND status = 'ACTIVE';