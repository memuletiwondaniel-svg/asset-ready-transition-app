
-- Add status to vcr_templates
ALTER TABLE public.vcr_templates 
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' 
CHECK (status IN ('draft', 'under_review', 'approved'));

-- Add individual approval status to vcr_template_approvers
ALTER TABLE public.vcr_template_approvers
ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by UUID REFERENCES auth.users(id);
