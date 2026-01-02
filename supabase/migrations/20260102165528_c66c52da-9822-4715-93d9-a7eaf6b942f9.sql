-- Create table to store allowed PSSR approver roles (managed via admin)
CREATE TABLE public.pssr_allowed_approver_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id)
);

-- Enable RLS
ALTER TABLE public.pssr_allowed_approver_roles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read allowed approver roles
CREATE POLICY "Authenticated users can read allowed approver roles"
ON public.pssr_allowed_approver_roles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify allowed approver roles
CREATE POLICY "Admins can manage allowed approver roles"
ON public.pssr_allowed_approver_roles
FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- Insert the initial allowed roles
INSERT INTO public.pssr_allowed_approver_roles (role_id)
SELECT id FROM public.roles 
WHERE name IN (
  'ORA Lead',
  'Engr. Manager (Asset)',
  'Engr. Manager (P&E)',
  'Dep. Plant Director',
  'Project Manager',
  'TSE Manager',
  'HSE Manager'
) AND is_active = true;