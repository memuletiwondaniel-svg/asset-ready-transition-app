
-- Add execution plan status to handover points
ALTER TABLE public.p2a_handover_points 
ADD COLUMN IF NOT EXISTS execution_plan_status text NOT NULL DEFAULT 'DRAFT';

-- Add execution plan approval tracking
ALTER TABLE public.p2a_handover_points 
ADD COLUMN IF NOT EXISTS execution_plan_submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS execution_plan_submitted_by uuid,
ADD COLUMN IF NOT EXISTS execution_plan_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS execution_plan_approved_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.p2a_handover_points.execution_plan_status IS 'VCR Execution Plan status: DRAFT, SUBMITTED, APPROVED, REJECTED';
