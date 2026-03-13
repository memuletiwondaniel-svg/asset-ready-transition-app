-- Add rejection context columns to p2a_handover_plans
ALTER TABLE p2a_handover_plans
  ADD COLUMN IF NOT EXISTS last_rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_by_name TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_by_role TEXT;