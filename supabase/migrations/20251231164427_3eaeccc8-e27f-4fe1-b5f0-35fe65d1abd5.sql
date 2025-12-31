-- First delete related data from pssr_reason_configuration
DELETE FROM pssr_reason_configuration WHERE reason_id IN (SELECT id FROM pssr_reasons);

-- Delete all pssr_reasons
DELETE FROM pssr_reasons;

-- Add status and reason_approver_role_ids columns to pssr_reasons
ALTER TABLE public.pssr_reasons 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_approval', 'approved', 'in_use')),
ADD COLUMN IF NOT EXISTS reason_approver_role_ids UUID[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.pssr_reasons.status IS 'Status of the PSSR Reason: draft, awaiting_approval, approved, in_use';
COMMENT ON COLUMN public.pssr_reasons.reason_approver_role_ids IS 'Array of role IDs that can approve this PSSR Reason for use';