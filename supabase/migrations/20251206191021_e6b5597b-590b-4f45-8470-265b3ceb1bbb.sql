-- Add comments and user_id columns to pssr_approvers table
ALTER TABLE public.pssr_approvers 
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pssr_approvers_user_id ON public.pssr_approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_pssr_approvers_pssr_status ON public.pssr_approvers(pssr_id, status);

-- Enable RLS on pssr_approvers if not already enabled
ALTER TABLE public.pssr_approvers ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing approvers (anyone can view)
DROP POLICY IF EXISTS "Anyone can view pssr approvers" ON public.pssr_approvers;
CREATE POLICY "Anyone can view pssr approvers"
ON public.pssr_approvers
FOR SELECT
USING (true);

-- Create policy for inserting approvers
DROP POLICY IF EXISTS "Users can create pssr approvers" ON public.pssr_approvers;
CREATE POLICY "Users can create pssr approvers"
ON public.pssr_approvers
FOR INSERT
WITH CHECK (true);

-- Create policy for updating approvers (user can update their own or admins)
DROP POLICY IF EXISTS "Users can update their approvals" ON public.pssr_approvers;
CREATE POLICY "Users can update their approvals"
ON public.pssr_approvers
FOR UPDATE
USING (user_id = auth.uid() OR user_is_admin(auth.uid()));