-- Create table for allowed SoF approver roles (dynamic, not hardcoded)
CREATE TABLE public.sof_allowed_approver_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(role_id)
);

-- Enable RLS
ALTER TABLE public.sof_allowed_approver_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone can read sof allowed approver roles"
ON public.sof_allowed_approver_roles
FOR SELECT
TO authenticated
USING (true);

-- Insert the allowed SoF approver roles: Plant Director, P&E Director, HSE Director, P&M Director
INSERT INTO public.sof_allowed_approver_roles (role_id) VALUES
    ('ba9391b0-d263-4714-91a7-f73323c66bb2'),  -- Plant Director
    ('f371a282-0a3d-4251-98b6-fe65462c637b'),  -- P&E Director
    ('08f95326-e84a-4c26-874d-0399ece612ba'),  -- HSE Director
    ('62c2424d-6ce8-40d6-9979-5b7222efff50');  -- P&M Director