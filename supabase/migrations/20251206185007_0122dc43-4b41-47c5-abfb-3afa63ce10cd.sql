-- Create pssr_reason_configuration table to map PSSR reasons to checklists, PSSR approvers, and SoF approvers
CREATE TABLE public.pssr_reason_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_id UUID NOT NULL REFERENCES public.pssr_reasons(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL,
  pssr_approver_role_ids UUID[] DEFAULT '{}',
  sof_approver_role_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(reason_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.pssr_reason_configuration IS 'Maps PSSR reasons to their associated checklists, PSSR approver roles, and SoF approver roles';

-- Enable Row Level Security
ALTER TABLE public.pssr_reason_configuration ENABLE ROW LEVEL SECURITY;

-- Admin users can manage all configurations
CREATE POLICY "Admin users can manage configurations"
ON public.pssr_reason_configuration
FOR ALL
USING (user_is_admin(auth.uid()));

-- All authenticated users can view configurations (needed during PSSR creation)
CREATE POLICY "Authenticated users can view configurations"
ON public.pssr_reason_configuration
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger to update updated_at
CREATE TRIGGER update_pssr_reason_configuration_updated_at
BEFORE UPDATE ON public.pssr_reason_configuration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();