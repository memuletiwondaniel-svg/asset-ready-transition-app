-- Update existing status values to new 3-state system
UPDATE public.pssr_reasons SET status = 'draft' WHERE status IN ('awaiting_approval', 'approved');
UPDATE public.pssr_reasons SET status = 'active' WHERE status = 'in_use';

-- Add a comment for documentation
COMMENT ON COLUMN public.pssr_reasons.status IS 'Template status: draft (being configured), active (available for use), inactive (disabled/archived)';